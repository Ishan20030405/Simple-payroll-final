// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// ============================================
// API CONFIGURATION
// ============================================
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    timeout: 10000 // 10 seconds timeout
});

// ============================================
// REQUEST INTERCEPTOR - Add Token to Headers
// ============================================
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ============================================
// RESPONSE INTERCEPTOR - Handle Token Expiry
// ============================================
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth-expired'));
        }
        return Promise.reject(error);
    }
);

// ============================================
// AUTH PROVIDER
// ============================================
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [profilePictureUrl, setProfilePictureUrl] = useState('');
    const [pictureVersion, setPictureVersion] = useState(0);
    const refreshProfilePicture = useCallback(() => setPictureVersion(value => value + 1), []);
    useEffect(() => {
        let cancelled = false;
        let objectUrl = '';
        setProfilePictureUrl('');
        if (user?.id) {
            api.get('/auth/profile-picture', { responseType: 'blob' }).then(response => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(response.data);
                setProfilePictureUrl(objectUrl);
            }).catch(error => {
                if (error.response?.status !== 404) console.error('Unable to load profile picture');
            });
        }
        return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [user?.id, pictureVersion]);

    // ============================================
    // CHECK AUTH FUNCTION (Memoized with useCallback)
    // ============================================
    const checkAuth = useCallback(async () => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
            try {
                // Verify token with backend
                const response = await api.get('/auth/me');
                const userData = response.data;
                
                if (userData && typeof userData === 'object') {
                    setUser(userData);
                    setIsAuthenticated(true);
                    localStorage.setItem('user', JSON.stringify(userData));
                } else {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setIsAuthenticated(true);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
                setIsAuthenticated(false);
                setAuthError('Session expired. Please login again.');
            }
        } else {
            setUser(null);
            setIsAuthenticated(false);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const expired=(event)=>{localStorage.removeItem('token');localStorage.removeItem('user');setUser(null);setIsAuthenticated(false);setLoading(false);setAuthError(typeof event.detail==='string'?event.detail:'Session expired. Please sign in again.');};
        window.addEventListener('auth-expired',expired);
        return ()=>window.removeEventListener('auth-expired',expired);
    },[]);

    // Check authentication on mount
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // ============================================
    // LOGIN FUNCTION (Step 1: Triggers 2FA Email)
    // ============================================
    const login = async (username, password) => {
        setLoading(true);
        setAuthError(null);
        
        try {
            if (!username || !password) {
                return {
                    success: false,
                    error: 'Username and password are required'
                };
            }

            const response = await api.post('/auth/login', { 
                username: username.trim(), 
                password: password 
            }, { timeout: 30000 });
            
            if (response.data?.require2FA) {
                return {
                    success: true,
                    require2FA: true,
                    message: response.data.message,
                    email: response.data.email,
                    username: response.data.username
                };
            }

            const { token, user: userData } = response.data;

            if (!token || !userData) {
                return {
                    success: false,
                    error: 'Invalid response from server'
                };
            }

            const userWithRole = {
                ...userData,
                role: userData.role || 'EMPLOYEE'
            };

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userWithRole));

            setUser(userWithRole);
            setIsAuthenticated(true);
            
            return { 
                success: true, 
                user: userWithRole 
            };

        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. Please try again.';
            
            if (error.response) {
                errorMessage = error.response.data?.error || 
                              error.response.data?.message || 
                              'Invalid credentials. Please try again.';
                
                if (error.response.status === 401) {
                    errorMessage = 'Invalid username or password';
                } else if (error.response.status === 403) {
                    errorMessage = error.response.data?.error || 'Your account has been deactivated. Please contact your administrator.';
                } else if (error.response.status === 404) {
                    errorMessage = 'User not found';
                } else if (error.response.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }
            } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                errorMessage = 'The server took too long to respond. If you received a verification email, try signing in again to get a new code.';
            } else if (error.request) {
                errorMessage = 'Cannot reach the backend server. Make sure it is running, then try again.';
            }

            setAuthError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // VERIFY OTP FUNCTION (Step 2: Completes 2FA Login)
    // ============================================
    const verifyOTP = async (username, otp) => {
        setLoading(true);
        setAuthError(null);
        try {
            const response = await api.post('/auth/verify-otp', { username, otp });
            const { token, user: userData } = response.data;

            const userWithRole = {
                ...userData,
                role: userData.role || 'EMPLOYEE'
            };

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userWithRole));

            setUser(userWithRole);
            setIsAuthenticated(true);

            return {
                success: true,
                user: userWithRole
            };
        } catch (error) {
            console.error('Verify OTP error:', error);
            const errorMessage = error.response?.data?.message || 'Verification failed. Please try again.';
            setAuthError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // LOGOUT FUNCTION
    // ============================================
    const logout = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    await api.post('/auth/logout');
                } catch (error) {
                    console.error('Logout API error:', error);
                }
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
        }
    };

    // ============================================
    // REGISTER FUNCTION
    // ============================================
    const register = async (username, password, role = 'EMPLOYEE') => {
        setLoading(true);
        setAuthError(null);
        
        try {
            if (!username || !password) {
                return {
                    success: false,
                    error: 'Username and password are required'
                };
            }

            if (password.length < 4) {
                return {
                    success: false,
                    error: 'Password must be at least 4 characters'
                };
            }

            const response = await api.post('/auth/register', {
                username: username.trim(),
                password,
                role
            });

            return {
                success: true,
                data: response.data,
                message: 'Registration successful! Please login.'
            };

        } catch (error) {
            console.error('Registration error:', error);
            
            let errorMessage = 'Registration failed. Please try again.';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            setAuthError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // UPDATE USER FUNCTION
    // ============================================
    const updateUser = async (userData) => {
        try {
            const response = await api.put(`/auth/update/${user.id}`, userData);
            const updatedUser = response.data.user;
            
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            return {
                success: true,
                user: updatedUser
            };
        } catch (error) {
            console.error('Update user error:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to update user'
            };
        }
    };

    const getUserRole = () => user?.role || 'EMPLOYEE';
    const isAdmin = () => user?.role === 'ADMIN';
    const isEmployee = () => user?.role === 'EMPLOYEE';

    const contextValue = {
        profilePictureUrl,
        refreshProfilePicture,
        user,
        isAuthenticated,
        loading,
        authError,
        login,
        verifyOTP,
        logout,
        register,
        checkAuth,
        updateUser,
        getUserRole,
        isAdmin,
        isEmployee,
        api
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export { api };

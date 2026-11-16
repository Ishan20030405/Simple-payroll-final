// src/components/ProtectedRoute.jsx
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = ['ADMIN'] }) => {
    const { isAuthenticated, checkAuth, loading, user } = useAuth();

    useEffect(() => {
        checkAuth();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user?.role)) {
        return <Navigate to={user?.role === 'ADMIN' ? '/dashboard' : user?.role === 'HR' ? '/employees' : '/employee-dashboard'} replace />;
    }

    return children;
};

export default ProtectedRoute;

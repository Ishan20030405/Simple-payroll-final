// src/components/LoginForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaShieldAlt } from 'react-icons/fa';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('LOGIN'); // 'LOGIN' or 'OTP'
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const otpRefs = useRef([]);

  const { login, verifyOTP, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Load saved credentials on component mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('savedUsername');
    const rememberMeChecked = localStorage.getItem('rememberMeChecked');
    
    if (savedUsername && rememberMeChecked === 'true') {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (step === 'LOGIN') {
      if (!username || !password) {
        setError('Please enter both username and password');
        setLoading(false);
        return;
      }

      const result = await login(username, password);

      if (result.success) {
        if (result.require2FA) {
          setStep('OTP');
          setMaskedEmail(result.email || 'your registered email');
        } else {
          // Direct login (if 2FA disabled)
          if (rememberMe) {
            localStorage.setItem('savedUsername', username);
            localStorage.setItem('rememberMeChecked', 'true');
          }
          navigate('/dashboard');
        }
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } else if (step === 'OTP') {
      const otpCode = otpDigits.join('');
      if (otpCode.length !== 6) {
        setError('Please enter the 6-digit verification code');
        setLoading(false);
        return;
      }

      const result = await verifyOTP(username, otpCode);

      if (result.success) {
        if (rememberMe) {
          localStorage.setItem('savedUsername', username);
          localStorage.setItem('rememberMeChecked', 'true');
        } else {
          localStorage.removeItem('savedUsername');
          localStorage.removeItem('rememberMeChecked');
        }
        navigate('/dashboard');
      } else {
        setError(result.error || 'Verification failed. Please check the OTP code.');
      }
    }

    setLoading(false);
  };

  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;
    
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = value;
    setOtpDigits(newOtpDigits);

    // Auto focus next input
    if (value && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Move to previous input on backspace if current is empty
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0 && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtpDigits = [...otpDigits];
    for (let i = 0; i < pastedData.length; i++) {
      newOtpDigits[i] = pastedData[i];
    }
    setOtpDigits(newOtpDigits);

    // Focus the last filled input or the very last input
    const focusIndex = Math.min(pastedData.length, 5);
    if (otpRefs.current[focusIndex]) {
        if(pastedData.length === 6) {
             otpRefs.current[5].focus();
        } else {
             otpRefs.current[focusIndex].focus();
        }
    }
  };

  // Handle Remember Me checkbox change
  const handleRememberMeChange = (e) => {
    const isChecked = e.target.checked;
    setRememberMe(isChecked);
    
    if (!isChecked) {
      localStorage.removeItem('savedUsername');
      localStorage.removeItem('rememberMeChecked');
    }
  };

  if (step === 'OTP') {
    return (
      <form onSubmit={handleSubmit} aria-busy={loading}>
        <div className="login-otp-heading">
          <FaShieldAlt aria-hidden="true" />
          <h3>Check your email</h3>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
            We've sent a 6-digit verification code to <strong>{maskedEmail}</strong>.
          </p>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* OTP Input Field */}
        <div style={{ marginBottom: '20px' }}>
          <span className="input-label login-otp-label">
            Enter 6-digit authentication code
          </span>
          <div className="login-otp-inputs" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (otpRefs.current[index] = el)}
                type="text"
                maxLength={1}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                aria-label={`Verification digit ${index + 1}`}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onFocus={(e) => e.target.select()}
                required
                autoFocus={index === 0}
              />
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-btn"
          disabled={loading}
          style={{ marginTop: '15px' }}
        >
          {loading ? 'Verifying Code...' : 'Verify & Continue'}
        </button>

        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <button
            type="button"
            className="forgot-link"
            onClick={() => { setStep('LOGIN'); setError(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Back to Login
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={loading}>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {/* Username Field */}
      <div className="input-group">
        <label className="input-label" htmlFor="login-username">Username</label>
        <div className="input-wrapper">
          <FaUser className="input-icon" />
          <input
            type="text"
            id="login-username"
            autoComplete="username"
            className="input-field"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="input-group">
        <label className="input-label" htmlFor="login-password">Password</label>
        <div className="input-wrapper">
          <FaLock className="input-icon" />
          <input
            type={showPassword ? 'text' : 'password'}
            id="login-password"
            autoComplete="current-password"
            className="input-field"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <label className="remember-me">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={handleRememberMeChange}
          />
          Remember me
        </label>
        <a href="/forgot-password" className="forgot-link">
          Forgot password?
        </a>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="submit-btn"
        disabled={loading}
      >
        {loading ? 'Sending Verification Code...' : 'Sign In'}
      </button>
    </form>
  );
};

export default LoginForm;

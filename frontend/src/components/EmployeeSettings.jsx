// src/components/EmployeeSettings.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './EmployeeSettings.css';
import { 
  Lock,
  AlertCircle, CheckCircle, Eye, EyeOff
} from 'lucide-react';

const EmployeeSettings = () => {
  const { api } = useAuth();

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // If all fields are empty, password update is optional — nothing to do
    if (!passwordData.currentPassword && !passwordData.newPassword && !passwordData.confirmPassword) {
      setErrorMessage('Please fill in the password fields to update your password.');
      return;
    }

    // If partially filled, require all fields
    if (!passwordData.currentPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }

    if (!passwordData.newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (!passwordData.confirmPassword) {
      setErrorMessage('Please confirm your new password.');
      return;
    }

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match!');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters!');
      return;
    }

    setLoading(true);

    try {
      const response = await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setSuccessMessage(response.data.message || 'Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      window.dispatchEvent(new CustomEvent('auth-expired', {detail:'Password updated. Please sign in again.'}));
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update password. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="employee-settings">
      <div className="settings-grid">
        <div className="settings-card">
          <h3><Lock size={18} /> Change Password</h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Use at least 8 characters. After updating your password, sign in again.
          </p>
          <form onSubmit={handlePasswordUpdate}>
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="currentPassword"
                  id="currentPassword"
                  autoComplete="current-password"
                  required
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="newPassword"
                id="newPassword"
                autoComplete="new-password"
                minLength={8}
                required
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Enter new password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                id="confirmPassword"
                autoComplete="new-password"
                minLength={8}
                required
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Confirm new password"
              />
            </div>
            <button type="submit" className="settings-btn primary" disabled={loading}>
              {loading ? 'Updating...' : <><Lock size={16} /> Update Password</>}
            </button>
          </form>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="message success" role="status">
          <CheckCircle size={18} /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="message error" role="alert">
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}
    </div>
  );
};

export default EmployeeSettings;

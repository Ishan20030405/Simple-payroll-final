import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmployeeProfile from './EmployeeProfile';
import EmployeeSettings from './EmployeeSettings';
import './AccountProfile.css';
import ProfilePicture from './ProfilePicture';

const AccountProfile = () => {
  const { user } = useAuth();
  const employee = user?.employee;

  return (
    <section className="account-profile">
      <h1>My Profile</h1>
      <ProfilePicture />
      <div className="account-summary">
        <h2>Account Information</h2>
        <dl>
          <div><dt>Username</dt><dd>{user?.username}</dd></div>
          <div><dt>Account Type</dt><dd>{user?.role === 'ADMIN' ? 'Admin' : 'HR'}</dd></div>
        </dl>
      </div>
      {employee ? (
        <EmployeeProfile showPasswordSettings employee={{
          ...employee,
          fullName: employee.full_name,
          joinDate: employee.join_date,
          maritalStatus: employee.marital_status,
          emergencyContact: employee.emergency_contact
        }} />
      ) : <EmployeeSettings />}
    </section>
  );
};

export default AccountProfile;

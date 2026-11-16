// src/components/EmployeeDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, User, FileText, Settings, 
  LogOut, Search, Bell, ChevronDown,
  Download, Printer, Calendar, DollarSign,
  Home, CreditCard, UserCheck
} from 'lucide-react';
import EmployeeProfile from './EmployeeProfile';
import EmployeePayslip from './EmployeePayslip';
import EmployeeSettings from './EmployeeSettings';
import ProfilePicture, { ProfileAvatar } from './ProfilePicture';
import './EmployeeLayout.css';

const EmployeeDashboard = () => {
  const { user, logout, api } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('Northfield');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');

  useEffect(() => {
    const loadCompanyBranding = async () => {
      try {
        const companyResponse = await api.get('/company-information');
        if (companyResponse.data?.company_name) {
          setCompanyName(companyResponse.data.company_name);
        }
        const logoResponse = await api.get('/company-information/logo', { responseType: 'blob' });
        const logoUrl = URL.createObjectURL(logoResponse.data);
        setCompanyLogoUrl(previousUrl => {
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          return logoUrl;
        });
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Failed to load company branding:', error);
        }
      }
    };

    loadCompanyBranding();
    window.addEventListener('company-information-updated', loadCompanyBranding);
    return () => {
      window.removeEventListener('company-information-updated', loadCompanyBranding);
      setCompanyLogoUrl(previousUrl => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return '';
      });
    };
  }, [api]);

  useEffect(() => {
    const loadEmployeeData = async () => {
      try {
        const response = await api.get('/auth/me');
        const employee = response.data?.employee;

        if (employee) {
          setEmployeeData({
            ...employee,
            fullName: employee.full_name,
            joinDate: employee.join_date,
            maritalStatus: employee.marital_status,
            emergencyContact: employee.emergency_contact,
            basicSalary: employee.basic_salary ?? employee.designation_basic_salary
          });
        } else {
          setEmployeeData(null);
        }
      } catch (error) {
        console.error('Failed to load employee profile:', error);
        setEmployeeData(null);
      } finally {
        setLoading(false);
      }
    };
    loadEmployeeData();
  }, [api]);

  // ✅ Fixed: Single click logout
  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    logout();
    navigate('/login');
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Render content based on active tab
  const renderContent = () => {
    switch(activeTab) {
      case 'profile':
        return <><ProfilePicture /><EmployeeProfile employee={employeeData} /></>;
      case 'payslip':
        return <EmployeePayslip employee={employeeData} />;
      case 'settings':
        return <EmployeeSettings employee={employeeData} />;
      default:
        return <><ProfilePicture /><EmployeeProfile employee={employeeData} /></>;
    }
  };

  if (loading) {
    return (
      <div className="employee-dashboard-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-dashboard-container premium-workspace">
      {/* Sidebar */}
      <aside className="employee-sidebar">
        <div className="sidebar-logo">
          {companyLogoUrl ? <img src={companyLogoUrl} alt="Company logo" className="logo-icon" /> : <span className="logo-icon">{companyName.charAt(0)}</span>}
          <span className="workspace-brand-copy">{companyName}<small>MY WORKSPACE</small></span>
        </div>
        
        <nav className="sidebar-nav">
          {user?.role==='HR' && <NavLink to="/employees" className="nav-item"><User size={18} /> HR workspace</NavLink>}
          {/* Profile Tab */}
          <div 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} /> Profile
          </div>
          
          {/* Payslip Tab */}
          <div 
            className={`nav-item ${activeTab === 'payslip' ? 'active' : ''}`}
            onClick={() => setActiveTab('payslip')}
          >
            <FileText size={18} /> Payslip
          </div>

          {/* Settings Tab */}
          <div 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} /> Settings
          </div>
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <div 
            className="nav-item logout-btn" 
            onClick={handleLogout}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                logout();
                navigate('/login');
              }
            }}
          >
            <LogOut size={18} /> Log out
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="employee-main-wrapper">
        {/* Topbar */}
        <header className="employee-topbar">
          <div className="topbar-left">
            <h2 className="page-title">
              {activeTab === 'profile' && 'My Profile'}
              {activeTab === 'payslip' && 'My Payslips'}
              {activeTab === 'settings' && 'Settings'}
            </h2>
          </div>
          
          <div className="topbar-actions">
            
            <div className="user-profile">
              <ProfileAvatar />
              <div className="user-info">
                <span className="user-name">{user?.fullName || user?.username || 'Employee'}</span>
                <span className="user-role">Employee</span>
              </div>
              <ChevronDown size={16} color="#6b7280" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="employee-page-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;

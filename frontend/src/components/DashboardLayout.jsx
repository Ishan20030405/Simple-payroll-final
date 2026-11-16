// src/components/DashboardLayout.jsx
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Calculator, 
  FileText, BarChart2, LogOut, 
  Search, Bell, ChevronDown,
  ClipboardList, Settings, Receipt, User
} from 'lucide-react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './DashboardLayout.css';
import { ProfileAvatar } from './ProfilePicture';

const DashboardLayout = () => {
  const { user, logout, api } = useAuth();
  const navigate = useNavigate();
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

  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="dashboard-container premium-workspace">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          {companyLogoUrl ? <img src={companyLogoUrl} alt="Company logo" className="logo-icon" /> : <span className="logo-icon">{companyName.charAt(0)}</span>}
          <span className="workspace-brand-copy">{companyName}</span>
        </div>
        
        <nav className="sidebar-nav">
          {/* ✅ Dashboard Link */}
          {user?.role==='ADMIN' && (<NavLink 
            to="/dashboard" 
            className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
          >
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>)}
          
          {/* ✅ Employees Link - FIXED */}
          <NavLink 
            to="/employees" 
            className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
          >
            <Users size={18} /> Employees
          </NavLink>

          <NavLink 
            to="/attendance" 
            className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
          >
            <ClipboardList size={18} /> Attendance
          </NavLink>

          {user?.role==='ADMIN' && (<NavLink to="/payroll" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <Calculator size={18} /> Payroll
          </NavLink>)}

          {user?.role==='ADMIN' && (<NavLink to="/payslips" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <FileText size={18} /> Payslips
          </NavLink>)}          

          {user?.role==='ADMIN' && (<NavLink to="/tax" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <Receipt size={18} /> Tax
          </NavLink>)}

          <NavLink to="/reports" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <BarChart2 size={18} /> Reports
          </NavLink>

          {user?.role==='ADMIN' && (<NavLink to="/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <Settings size={18} /> Settings
          </NavLink>)}
          <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <User size={18} /> Profile
          </NavLink>
        {user?.role==='HR' && <NavLink to="/employee-dashboard" className="nav-item"><Users size={18} /> My account</NavLink>}
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
      <div className="main-wrapper">
        <header className="topbar">
          <div className="global-search">
            <Search size={16} className="search-icon" />
            <input type="search" aria-label="Search employees" placeholder="Search employees, then press Enter" onKeyDown={event=>{if(event.key==='Enter')navigate(`/employees?search=${encodeURIComponent(event.currentTarget.value)}`);}} />
          </div>
          
          <div className="topbar-actions">
            {user?.role==='ADMIN' && <button type="button" title="View activity" aria-label="View recent activity" onClick={()=>navigate('/activities')} style={{border:0,background:'none',padding:0,cursor:'pointer'}}><Bell size={20} className="bell-icon" /></button>}
            <div className="user-profile">
              <ProfileAvatar />
              <div className="user-info">
                <span className="user-name">{user?.fullName || user?.username || 'Admin'}</span>
                <span className="user-role">{user?.role || 'Admin'}</span>
              </div>
              <ChevronDown size={16} color="#6b7280" />
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};



export default DashboardLayout;

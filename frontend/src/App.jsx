// src/App.jsx - With Nested Routes
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployeesPage from './features/team/EmployeesPage';
import AttendancePage from './features/attendance/AttendancePage';
import PayrollPage from './features/payroll/PayrollPage';
import SettingsPage from './features/settings/SettingsPage';
import PayslipsPage from './features/payslips/PayslipsPage';
import DashboardPage from './features/dashboard/DashboardPage';
import ReportsPage from './features/reports/ReportsPage';
import ActivitiesPage from './features/activities/ActivitiesPage';
import TaxPage from './features/tax/TaxPage';
import AccountProfile from './components/AccountProfile';
import PasswordRecoveryPage from './pages/PasswordRecoveryPage';
import ProtectedRoute from './components/ProtectedRoute';

const Home = () => { const {user}=useAuth(); return <Navigate to={user?.role==='HR'?'/employees':'/dashboard'} replace />; };
const AdminPage = ({children}) => <ProtectedRoute allowedRoles={['ADMIN']}>{children}</ProtectedRoute>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<PasswordRecoveryPage key="forgot" />} />
            <Route path="/reset-password" element={<PasswordRecoveryPage key="reset" reset />} />
            
            {/* ✅ Dashboard Layout with Nested Routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute allowedRoles={['ADMIN','HR']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="dashboard" element={<AdminPage><DashboardPage /></AdminPage>} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="profile" element={<AccountProfile />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="payroll" element={<AdminPage><PayrollPage /></AdminPage>} />
              <Route path="payslips" element={<AdminPage><PayslipsPage /></AdminPage>} />
              <Route path="tax" element={<AdminPage><TaxPage /></AdminPage>} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="activities" element={<AdminPage><ActivitiesPage /></AdminPage>} />
              <Route path="settings" element={<AdminPage><SettingsPage /></AdminPage>} />
            </Route>
            
            {/* Employee Routes */}
            <Route 
              path="/employee-dashboard" 
              element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'HR']}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

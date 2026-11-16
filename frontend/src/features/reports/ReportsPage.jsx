import React from 'react';
import ReportCenter from './ReportCenter';
import {useAuth} from '../../contexts/AuthContext';
import '../dashboard/ManagementOverview.css';

export default function ReportsPage() {
  const {user}=useAuth();
  return <section className="overview-page">
    <div className="overview-heading">
      <div><p className="overview-kicker">{user?.role==='HR'?'HR / Attendance':'Payroll / Analysis'}</p><h1 className="overview-title">Reports</h1><p className="overview-subtitle">Review monthly records and download reports as PDF.</p></div>
    </div>
    <ReportCenter />
  </section>;
}

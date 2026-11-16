import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  FileText,
  Users,
  WalletCards
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './ManagementOverview.css';

const formatCurrency = (value) => `Rs ${(Number(value) || 0).toLocaleString('en-US', {
  maximumFractionDigits: 0
}).replace(/,/g, ' ')}`;

const formatAxisValue = (value) => Math.round(value).toLocaleString('en-US').replace(/,/g, ' ');

const DashboardPage = () => {
  const { api } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      try {
        const [employeeResponse, departmentResponse, payrollResponse, expenseResponse] = await Promise.all([
          api.get('/employees'),
          api.get('/departments'),
          api.get('/payrolls'),
          api.get('/monthly-salary-expenses?limit=12')
        ]);
        if (!active) return;
        setEmployees(employeeResponse.data || []);
        setDepartments(departmentResponse.data || []);
        setPayrolls(payrollResponse.data || []);
        setMonthlyExpenses(expenseResponse.data || []);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadDashboard();
    return () => { active = false; };
  }, [api]);

  useEffect(() => {
    let active = true;
    const refreshMonthlyExpenses = async () => {
      try {
        const response = await api.get('/monthly-salary-expenses?limit=12');
        if (active) setMonthlyExpenses(response.data || []);
      } catch (error) {
        console.error('Failed to refresh monthly salary expenses:', error);
      }
    };
    const intervalId = window.setInterval(refreshMonthlyExpenses, 30000);
    window.addEventListener('focus', refreshMonthlyExpenses);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshMonthlyExpenses);
    };
  }, [api]);

  const activeEmployees = employees.filter(employee => employee.status === 'Active');
  const latestPayrollMonth = payrolls[0]?.month_year;
  const latestPayrolls = payrolls.filter(payroll => payroll.month_year === latestPayrollMonth);
  const processedAmount = latestPayrolls.reduce((sum, payroll) => sum + Number(payroll.net_salary || 0), 0);
  const pendingPayrolls = payrolls.filter(payroll => String(payroll.status).toLowerCase() === 'pending').length;
  const expenseYear = monthlyExpenses.length
    ? Number(monthlyExpenses[monthlyExpenses.length - 1].year)
    : new Date().getFullYear();
  const chartExpenses = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return monthlyExpenses.find(expense => Number(expense.year) === expenseYear && Number(expense.month) === month)
      || { year: expenseYear, month, total_monthly_expenses: 0 };
  });
  const maximumMonthlyExpense = Math.max(...chartExpenses.map(expense => Number(expense.total_monthly_expenses) || 0), 1);
  const departmentDetails = departments.map(department => {
    const departmentEmployees = employees.filter(employee => employee.department === department.department_id);
    const departmentPayrolls = latestPayrolls.filter(payroll => payroll.department === department.department_id);
    return {
      ...department,
      employeeCount: departmentEmployees.length,
      activeCount: departmentEmployees.filter(employee => employee.status === 'Active').length,
      payrollTotal: departmentPayrolls.reduce((sum, payroll) => sum + Number(payroll.net_salary || 0), 0)
    };
  });

  return (
    <section className="overview-page fade-in">
      <div className="overview-heading">
        <div>
          <p className="overview-kicker">Northfield / Operations</p>
          <h1 className="overview-title">Dashboard</h1>
          <p className="overview-subtitle">A clear view of people, payroll, and what needs attention.</p>
        </div>
        <div className="overview-period">
          <span className="overview-period-label">Current run</span>
          <strong>{latestPayrollMonth ? new Date(latestPayrollMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'No payroll yet'}</strong>
        </div>
      </div>

      <div className="overview-stat-grid">
        <article className="overview-stat-card">
          <div className="overview-stat-top"><span>Total employees</span><span className="overview-icon steel"><Users size={17} /></span></div>
          <strong>{loading ? '...' : employees.length}</strong>
          <span className="overview-stat-note"><ArrowUpRight size={14} /> {activeEmployees.length} active employees</span>
        </article>
        <article className="overview-stat-card">
          <div className="overview-stat-top"><span>Payroll processed</span><span className="overview-icon blue"><Calculator size={17} /></span></div>
          <strong>{loading ? '...' : formatCurrency(processedAmount)}</strong>
          <span className="overview-stat-note"><ArrowUpRight size={14} /> Latest payroll run</span>
        </article>
        <article className="overview-stat-card">
          <div className="overview-stat-top"><span>Active employees</span><span className="overview-icon green"><CheckCircle2 size={17} /></span></div>
          <strong>{loading ? '...' : activeEmployees.length}</strong>
          <span className="overview-stat-note muted">Current workforce</span>
        </article>
        <article className="overview-stat-card">
          <div className="overview-stat-top"><span>Pending payrolls</span><span className="overview-icon amber"><WalletCards size={17} /></span></div>
          <strong>{loading ? '...' : pendingPayrolls}</strong>
          <span className="overview-stat-note muted">Awaiting completion</span>
        </article>
      </div>

      <div className="overview-content-grid">
        <article className="overview-panel overview-chart-panel">
          <div className="overview-panel-heading"><div><p className="overview-panel-label">Payroll overview</p><h2>Monthly salary expense</h2></div><Calculator size={18} /></div>
          <div className="overview-chart-area">
            <div className="overview-chart-axis" aria-hidden="true">
              {[1, 0.75, 0.5, 0.25, 0].map(ratio => <span key={ratio}>{formatAxisValue(maximumMonthlyExpense * ratio)}</span>)}
            </div>
            <div className="overview-chart" aria-label="Monthly salary expense trend">
              {chartExpenses.map(expense => {
                const amount = Number(expense.total_monthly_expenses) || 0;
                const height = amount ? Math.max((amount / maximumMonthlyExpense) * 100, 8) : 0;
                return <div className="overview-bar-wrap" key={`${expense.year}-${expense.month}`} title={formatCurrency(amount)}><div className="overview-bar" style={{ height: `${height}%` }} /><span>{new Date(expense.year, expense.month - 1).toLocaleString('en-US', { month: 'short' })}</span></div>;
              })}
            </div>
          </div>
        </article>
        <article className="overview-panel overview-breakdown-panel">
          <div className="overview-panel-heading"><div><p className="overview-panel-label">Workforce</p><h2>Employee mix</h2></div><Users size={18} /></div>
          <div className="overview-donut" style={{ '--active-share': `${employees.length ? (activeEmployees.length / employees.length) * 100 : 0}%` }}><div><strong>{employees.length ? Math.round((activeEmployees.length / employees.length) * 100) : 0}%</strong><span>active</span></div></div>
          <div className="overview-legend"><span><i className="legend-dot green" /> Active <b>{activeEmployees.length}</b></span><span><i className="legend-dot coral" /> Inactive <b>{employees.length - activeEmployees.length}</b></span></div>
        </article>
      </div>

      <article className="overview-panel overview-department-panel">
        <div className="overview-panel-heading"><div><p className="overview-panel-label">Organization directory</p><h2>Department details</h2></div><Users size={18} /></div>
        <div className="overview-department-grid">
          {departmentDetails.map(department => <div className="overview-department-card" key={department.department_id}>
            <div className="overview-department-card-top"><span className="overview-department-code">{department.department_id}</span><span className={`overview-status ${String(department.status).toLowerCase()}`}>{department.status}</span></div>
            <h3>{department.department_name}</h3>
            <div className="overview-department-meta"><span>Employees <b>{department.employeeCount}</b></span><span>Active <b>{department.activeCount}</b></span></div>
            <div className="overview-department-payroll"><span>Latest payroll</span><strong>{formatCurrency(department.payrollTotal)}</strong></div>
          </div>)}
          {!loading && departmentDetails.length === 0 && <p className="overview-empty">No departments available.</p>}
        </div>
      </article>

      <article className="overview-panel overview-table-panel">
        <div className="overview-panel-heading"><div><p className="overview-panel-label">Latest activity</p><h2>Recent payroll records</h2></div><FileText size={18} /></div>
        <div className="overview-table-scroll"><table className="overview-table"><thead><tr><th>Employee</th><th>Department</th><th>Net pay</th><th>Status</th></tr></thead><tbody>
          {latestPayrolls.slice(0, 6).map(payroll => <tr key={`${payroll.employee_id}-${payroll.month_year}`}><td><div className="overview-employee"><span className="overview-avatar">{String(payroll.full_name || payroll.employee_name || 'U').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</span><strong>{payroll.full_name || payroll.employee_name || 'Employee'}</strong></div></td><td>{payroll.department_name || payroll.department || 'Unassigned'}</td><td className="overview-money">{formatCurrency(payroll.net_salary)}</td><td><span className={`overview-status ${String(payroll.status).toLowerCase()}`}>{payroll.status || 'Pending'}</span></td></tr>)}
          {!loading && latestPayrolls.length === 0 && <tr><td colSpan="4" className="overview-empty">No payroll records available yet.</td></tr>}
        </tbody></table></div>
      </article>
    </section>
  );
};

export default DashboardPage;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Download, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import '../features/payslips/PayslipsPage.css';

const money = value => `Rs ${(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ')}`;
const parseData = record => typeof record.payroll_data === 'string' ? JSON.parse(record.payroll_data || '{}') : (record.payroll_data || {});

const EmployeePayslip = () => {
  const { api } = useAuth();
  const [records, setRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [company, setCompany] = useState({ company_name: 'Northfield (Pvt) Ltd', company_address: '', phone_number: '' });
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const paperRef = useRef(null);

  useEffect(() => {
    const loadPayslips = async () => {
      try {
        const response = await api.get('/payslips/my');
        const saved = response.data || [];
        setRecords(saved);
        setSelectedMonth(current => current && saved.some(record => (record.month_year_text || String(record.month_year)).slice(0, 7) === current)
          ? current : saved[0] ? (saved[0].month_year_text || String(saved[0].month_year)).slice(0, 7) : '');
      } catch (loadError) {
        console.error('Failed to load employee payslips:', loadError);
        setError('Unable to load your payslips.');
      }
    };
    loadPayslips();
  }, [api]);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const response = await api.get('/company-information');
        if (response.data) setCompany(response.data);
        const logo = await api.get('/company-information/logo', { responseType: 'blob' });
        setLogoUrl(URL.createObjectURL(logo.data));
      } catch (loadError) {
        if (loadError.response?.status !== 404) console.error('Failed to load company information:', loadError);
      }
    };
    loadCompany();
  }, [api]);

  useEffect(() => () => { if (logoUrl) URL.revokeObjectURL(logoUrl); }, [logoUrl]);

  const record = useMemo(() => records.find(item =>
    (item.month_year_text || String(item.month_year)).slice(0, 7) === selectedMonth
  ), [records, selectedMonth]);
  const data = record ? parseData(record) : {};
  const allowances = data.allowances || {};
  const monthLabel = selectedMonth ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'Select a month';
  const months = [...new Set(records.map(item => (item.month_year_text || String(item.month_year)).slice(0, 7)))];

  const downloadPdf = async () => {
    if (!paperRef.current || !record || isDownloading) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(paperRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const scale = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
      const width = canvas.width * scale;
      const height = canvas.height * scale;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height);
      pdf.save(`payslip-${record.employee_code}-${selectedMonth}.pdf`);
    } catch (downloadError) {
      setError('Unable to create the PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="payslips-page fade-in">
      <div className="payslips-toolbar">
        <div><h1 className="disp">Payslips</h1><p>View your completed payroll statement.</p></div>
        <div className="payslip-actions"><button className="btn-primary" onClick={downloadPdf} disabled={!record || isDownloading}><Download size={15} /> {isDownloading ? 'Creating PDF...' : 'Download PDF'}</button></div>
      </div>
      {error && <div className="payslip-status-message error">{error}</div>}
      <div className="payslip-filters stub"><div className="form-group">
        <label className="form-label"><Calendar size={14} /> Payroll month</label>
        <select className="input-style" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} disabled={!records.length}>
          {!records.length && <option value="">No completed payslips</option>}
          {months.map(month => <option key={month} value={month}>{new Date(`${month}-01T00:00:00`).toLocaleString('en-US', { month: 'long', year: 'numeric' })}</option>)}
        </select>
      </div></div>

      {record ? <article className="payslip-paper" ref={paperRef}>
        <header className="payslip-header"><div className="payslip-brand"><div className="payslip-logo">{logoUrl ? <img src={logoUrl} alt="Company logo" /> : <span>LOGO</span>}</div><div><h2>{company.company_name}</h2><p>{company.company_address || 'Company address'}</p><p>{company.phone_number || 'Company contact'}</p></div></div><div className="payslip-heading"><span>Pay sheet for the month of <strong>{monthLabel}</strong></span></div></header>
        <section className="payslip-employee-grid"><div><span>Employee name</span><strong>{record.employee_name}</strong></div><div><span>Department</span><strong>{record.department || '-'}</strong></div><div><span>Designation</span><strong>{record.designation || '-'}</strong></div><div><span>Employee ID</span><strong>{record.employee_code}</strong></div><div><span>Days worked</span><strong>{data.days_present ?? record.total_working_days ?? 0}</strong></div></section>
        <section className="payslip-section"><h3 className="section-title earnings-title">Earnings</h3><div className="payslip-line emphasis"><span>Basic Salary</span><strong>{money(record.basic_salary)}</strong></div><div className="payslip-line"><span>No Pay Days</span><strong>{record.total_no_pay_days || 0}</strong></div><div className="payslip-line"><span>No Pay Amount</span><strong>{money(record.no_pay_amount)}</strong></div><div className="payslip-line"><span>Late Hours</span><strong>{record.total_late_hours || 0}</strong></div><div className="payslip-line"><span>Late Amount</span><strong>{money(record.late_amount)}</strong></div><div className="payslip-line emphasis"><span>Salary for EPF</span><strong>{money(data.salary_for_epf ?? record.basic_salary)}</strong></div></section>
        <section className="payslip-section overtime-section"><h3 className="section-title overtime-title">Overtime</h3><div className="overtime-head"><span>Description</span><span>Rate</span><span>Hrs</span><span>Amt</span></div><div className="overtime-row"><span>Normal OT</span><strong>{money(data.normal_ot_rate)}</strong><strong>{data.normal_ot_hours || 0}</strong><strong>{money(record.total_normal_ot_amount)}</strong></div><div className="overtime-row"><span>Sunday OT</span><strong>{money(data.sunday_ot_rate)}</strong><strong>{data.sunday_ot_hours || 0}</strong><strong>{money(record.total_sunday_ot_amount)}</strong></div></section>
        <section className="payslip-section"><h3 className="section-title allowances-title">Allowances</h3>{['attendance_allowance', 'special_allowance', 'travelling_allowance', 'other_allowance'].map(key => <div className="payslip-line" key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{money(allowances[key] ?? record[key])}</strong></div>)}<div className="payslip-total"><span>Total Additions</span><strong>{money(record.total_additions)}</strong></div></section>
        <section className="payslip-results"><div><span>Gross salary</span><strong>{money(record.gross_salary)}</strong></div></section>
        <section className="payslip-section deductions-section"><h3 className="section-title deductions-title">Deductions</h3><div className="payslip-line"><span>Other Deduction</span><strong>{money(data.other_deduction ?? record.other_deduction)}</strong></div><div className="payslip-line"><span>EPF</span><strong>{money(record.epf)}</strong></div><div className="payslip-line"><span>APIT Tax</span><strong>{money(data.apit_tax)}</strong></div><div className="payslip-total"><span>Total Deduction</span><strong>{money(record.total_deductions)}</strong></div></section>
        <div className="net-result"><span>NET SALARY</span><strong>{money(record.net_salary)}</strong></div><footer className="payslip-footer"><div><span>Employee Signature:</span><i /></div><div><span>HR Officer:</span><i /></div><div><span>Authorized Signature:</span><i /></div><div><span>Date:</span><i /></div></footer>
      </article> : <div className="payslip-empty"><FileText size={30} /><span>No completed payslips available.</span></div>}
    </div>
  );
};

export default EmployeePayslip;
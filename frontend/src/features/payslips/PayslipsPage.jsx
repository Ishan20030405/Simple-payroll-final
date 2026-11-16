import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { Calendar, Download, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../contexts/AuthContext';
import './PayslipsPage.css';

const money = (value) => `Rs ${(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ')}`;

const createPayslipPdf = async (element, employee, selectedMonth) => {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const image = canvas.toDataURL('image/png');
  const margin = 8;
  const scale = Math.min(
    (pageWidth - margin * 2) / canvas.width,
    (pageHeight - margin * 2) / canvas.height
  );
  const imageWidth = canvas.width * scale;
  const imageHeight = canvas.height * scale;
  const imageX = (pageWidth - imageWidth) / 2;
  const imageY = (pageHeight - imageHeight) / 2;

  pdf.addImage(image, 'PNG', imageX, imageY, imageWidth, imageHeight);
  const employeeName = (employee?.full_name || employee?.employee_id || 'employee').replace(/[^a-z0-9]+/gi, '-');
  pdf.save(`payslip-${employeeName}-${selectedMonth}.pdf`);
};

const PayslipPaper = forwardRef(({ company, logoUrl, employee, monthLabel, summary, basicPay, salaryStructure, payroll, contribution }, ref) => {
  const allowances = [
    ['Attendance Allowance', salaryStructure?.attendance_allowance || 0],
    ['Special Allowance', salaryStructure?.special_allowance || 0],
    ['Travelling Allowance', salaryStructure?.travelling_allowance || 0],
    ['Other Allowance', salaryStructure?.other_allowance || 0]
  ];

  return (
    <article className="payslip-paper" ref={ref}>
      <header className="payslip-header">
        <div className="payslip-brand">
          <div className="payslip-logo">{logoUrl ? <img src={logoUrl} alt="Company logo" /> : <span>LOGO</span>}</div>
          <div>
            <h2>{company.company_name}</h2>
            <p>{company.company_address || 'Company address'}</p>
            <p>{company.phone_number || 'Company contact'}</p>
          </div>
        </div>
        <div className="payslip-heading">
          <span>Pay sheet for the month of <strong>{monthLabel}</strong></span>
        </div>
      </header>

      <section className="payslip-employee-grid">
        <div><span>Employee name</span><strong>{employee?.full_name || 'Not selected'}</strong></div>
        <div><span>Department</span><strong>{employee?.department || '-'}</strong></div>
        <div><span>Designation</span><strong>{employee?.designation || '-'}</strong></div>
        <div><span>Employee ID</span><strong>{employee?.employee_id || '-'}</strong></div>
        <div><span>Days worked</span><strong>{summary?.total_working_days || 0}</strong></div>
      </section>

      <section className="payslip-section">
        <h3 className="section-title earnings-title">Earnings</h3>
        <div className="payslip-line emphasis"><span>Basic Salary</span><strong>{money(payroll?.basic_salary ?? basicPay?.net_basic_pay)}</strong></div>
        <div className="payslip-line"><span>No Pay Days</span><strong>{summary?.total_no_pay_days || 0}</strong></div>
        <div className="payslip-line"><span>No Pay Amount</span><strong>{money(basicPay?.no_pay_amount)}</strong></div>
        <div className="payslip-line"><span>Late Hours</span><strong>{summary?.total_late_hours || 0}</strong></div>
        <div className="payslip-line"><span>Late Amount</span><strong>{money(basicPay?.late_amount)}</strong></div>
        <div className="payslip-line emphasis"><span>Salary for EPF</span><strong>{money(basicPay?.net_basic_pay)}</strong></div>
      </section>

      <section className="payslip-section overtime-section">
        <h3 className="section-title overtime-title">Overtime</h3>
        <div className="overtime-head"><span>Description</span><span>Rate</span><span>Hrs</span><span>Amt</span></div>
        <div className="overtime-row"><span>Normal OT</span><strong>{money(salaryStructure?.normal_ot_rate)}</strong><strong>{summary?.total_ot_hours || 0}</strong><strong>{money(payroll?.total_normal_ot_amount)}</strong></div>
        <div className="overtime-row"><span>Sunday OT</span><strong>{money(salaryStructure?.sunday_ot_rate)}</strong><strong>{summary?.total_sunday_working_hours || 0}</strong><strong>{money(payroll?.total_sunday_ot_amount)}</strong></div>
      </section>

      <section className="payslip-section">
        <h3 className="section-title allowances-title">Allowances</h3>
        {allowances.map(([label, value]) => <div className="payslip-line" key={label}><span>{label}</span><strong>{money(value)}</strong></div>)}
        <div className="payslip-total"><span>Total Additions</span><strong>{money(payroll?.total_additions)}</strong></div>
      </section>

      <section className="payslip-results">
        <div><span>Gross salary</span><strong>{money(payroll?.gross_salary)}</strong></div>
      </section>

      <section className="payslip-section deductions-section">
        <h3 className="section-title deductions-title">Deductions</h3>
        <div className="payslip-line"><span>Other Deduction</span><strong>{money(salaryStructure?.other_deductions)}</strong></div>
        <div className="payslip-line"><span>EPF</span><strong>{money(basicPay?.epf)}</strong></div>
        <div className="payslip-line"><span>APIT Tax</span><strong>{money(payroll?.apit_tax)}</strong></div>
        <div className="payslip-total"><span>Total Deduction</span><strong>{money(payroll?.total_deductions)}</strong></div>
      </section>

      <div className="net-result"><span>NET SALARY</span><strong>{money(payroll?.net_salary)}</strong></div>

      <section className="employer-contributions">
        <h3>Employer contributions</h3>
        <div className="payslip-line"><span>EPF</span><strong>{money(contribution?.epf_amount)}</strong></div>
        <div className="payslip-line"><span>ETF</span><strong>{money(contribution?.etf_amount)}</strong></div>
      </section>

      <footer className="payslip-footer">
        <div><span>Employee Signature:</span><i /></div>
        <div><span>HR Officer:</span><i /></div>
        <div><span>Authorized Signature:</span><i /></div>
        <div><span>Date:</span><i /></div>
      </footer>
    </article>
  );
});

PayslipPaper.displayName = 'PayslipPaper';

const PayslipsPage = () => {
  const { api } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [payslipOptions, setPayslipOptions] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [company, setCompany] = useState({ company_name: 'Northfield (Pvt) Ltd', company_address: '', phone_number: '' });
  const [logoUrl, setLogoUrl] = useState('');
  const [payroll, setPayroll] = useState(null);
  const [summary, setSummary] = useState(null);
  const [basicPay, setBasicPay] = useState(null);
  const [salaryStructure, setSalaryStructure] = useState(null);
  const [contribution, setContribution] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [batchPayslips, setBatchPayslips] = useState([]);
  const payslipPaperRef = useRef(null);
  const batchPaperRefs = useRef({});

  useEffect(() => {
    const loadPayslipOptions = async () => {
      try {
        const response = await api.get('/payslips/options');
        const options = response.data || [];
        setPayslipOptions(options);
        const employeeRows = [...new Map(options.map(row => [row.employee_code, {
          id: row.employee_id,
          employee_id: row.employee_code,
          full_name: row.employee_name,
          department: row.department,
          designation: row.designation
        }])).values()];
        setEmployees(employeeRows);
        setSelectedEmployeeId(current => current && employeeRows.some(item => item.employee_id === current)
          ? current
          : employeeRows[0]?.employee_id || '');
      } catch (error) {
        console.error('Failed to load payslip records:', error);
        setPayslipOptions([]);
        setEmployees([]);
      }
    };
    loadPayslipOptions();
  }, [api]);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const response = await api.get('/company-information');
        if (response.data) setCompany(response.data);
        const logo = await api.get('/company-information/logo', { responseType: 'blob' });
        setLogoUrl(URL.createObjectURL(logo.data));
      } catch (error) {
        if (error.response?.status !== 404) console.error('Failed to load payslip company information:', error);
      }
    };
    loadCompany();
  }, [api]);

  useEffect(() => {
    const loadMonths = async () => {
      const available = [...new Set(
        payslipOptions
          .filter(row => row.employee_code === selectedEmployeeId)
          .map(row => String(row.month_year_text || row.month_year).slice(0, 7))
      )].sort().reverse().map(value => {
        const [year, month] = value.split('-');
        return { year: Number(year), month: Number(month) };
      });
      setMonths(available);
      const first = available[0];
      setSelectedMonth(current => current && available.some(item => `${item.year}-${String(item.month).padStart(2, '0')}` === current)
        ? current
        : first ? `${first.year}-${String(first.month).padStart(2, '0')}` : '');
    };
    loadMonths();
  }, [payslipOptions, selectedEmployeeId]);

  useEffect(() => {
    const loadPayslip = async () => {
      const employee = employees.find(item => item.employee_id === selectedEmployeeId);
      const record = payslipOptions.find(item =>
        item.employee_code === selectedEmployeeId && String(item.month_year_text || item.month_year).slice(0, 7) === selectedMonth
      );
      if (!employee?.id || !selectedMonth || !record) {
        setPayroll(null);
        setSummary(null);
        setBasicPay(null);
        setSalaryStructure(null);
        setContribution(null);
        return;
      }
      const data = typeof record.payroll_data === 'string'
        ? JSON.parse(record.payroll_data || '{}')
        : (record.payroll_data || {});
      setPayroll({ ...record, apit_tax: data.apit_tax || 0, status: record.payroll_status });
      setSummary({
        total_working_days: data.days_present ?? record.total_working_days,
        total_no_pay_days: record.total_no_pay_days,
        total_late_hours: record.total_late_hours,
        total_ot_hours: data.normal_ot_hours,
        total_sunday_working_hours: data.sunday_ot_hours
      });
      setBasicPay({
        net_basic_pay: data.salary_for_epf ?? record.basic_salary,
        no_pay_amount: record.no_pay_amount,
        late_amount: record.late_amount,
        epf: record.epf
      });
      setSalaryStructure({
        normal_ot_rate: data.normal_ot_rate,
        sunday_ot_rate: data.sunday_ot_rate,
        attendance_allowance: record.attendance_allowance ?? data.allowances?.attendance_allowance ?? 0,
        special_allowance: record.special_allowance ?? data.allowances?.special_allowance ?? 0,
        travelling_allowance: record.travelling_allowance ?? data.allowances?.travelling_allowance ?? 0,
        other_allowance: record.other_allowance ?? data.allowances?.other_allowance ?? 0,
        other_deductions: record.other_deduction ?? data.other_deduction ?? 0,
        employer_epf: record.employer_epf ?? data.contribution?.epf_amount ?? 0,
        employer_etf: record.employer_etf ?? data.contribution?.etf_amount ?? 0
      });
      setContribution({
        epf_amount: record.employer_epf ?? data.contribution?.epf_amount ?? 0,
        etf_amount: record.employer_etf ?? data.contribution?.etf_amount ?? 0
      });
    };
    loadPayslip();
  }, [employees, payslipOptions, selectedEmployeeId, selectedMonth]);

  const employee = employees.find(item => item.employee_id === selectedEmployeeId);
  const payrollIsComplete = payroll?.status?.trim().toLowerCase() === 'complete';
  const monthLabel = selectedMonth ? new Date(`${selectedMonth}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'Select a month';
  const allowances = [
    ['Attendance Allowance', salaryStructure?.attendance_allowance || 0],
    ['Special Allowance', salaryStructure?.special_allowance || 0],
    ['Travelling Allowance', salaryStructure?.travelling_allowance || 0],
    ['Other Allowance', salaryStructure?.other_allowance || 0]
  ];

  const handleDownloadPdf = async () => {
    if (!payrollIsComplete || !payslipPaperRef.current || isDownloading) return;

    setDownloadError('');
    setIsDownloading(true);
    try {
      await createPayslipPdf(payslipPaperRef.current, employee, selectedMonth);
    } catch (error) {
      console.error('Failed to download payslip PDF:', error);
      setDownloadError('Unable to create the PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!selectedMonth || !payslipOptions.length || isDownloading) return;

    setDownloadError('');
    setIsDownloading(true);
    try {
      const records = payslipOptions
        .filter(record => String(record.month_year_text || record.month_year).slice(0, 7) === selectedMonth)
        .map(record => {
          const data = typeof record.payroll_data === 'string'
            ? JSON.parse(record.payroll_data || '{}')
            : (record.payroll_data || {});
          const currentEmployee = {
            id: record.employee_id,
            employee_id: record.employee_code,
            full_name: record.employee_name,
            department: record.department,
            designation: record.designation
          };
          return {
            employee: currentEmployee,
            payroll: { ...record, apit_tax: data.apit_tax || 0, status: record.payroll_status },
            summary: {
              total_working_days: record.total_working_days,
              total_no_pay_days: record.total_no_pay_days,
              total_late_hours: record.total_late_hours,
              total_ot_hours: data.normal_ot_hours,
              total_sunday_working_hours: data.sunday_ot_hours
            },
            basicPay: {
              net_basic_pay: data.salary_for_epf ?? record.basic_salary,
              no_pay_amount: record.no_pay_amount,
              late_amount: record.late_amount,
              epf: record.epf
            },
            salaryStructure: {
              normal_ot_rate: data.normal_ot_rate,
              sunday_ot_rate: data.sunday_ot_rate,
              attendance_allowance: record.attendance_allowance ?? data.allowances?.attendance_allowance ?? 0,
              special_allowance: record.special_allowance ?? data.allowances?.special_allowance ?? 0,
              travelling_allowance: record.travelling_allowance ?? data.allowances?.travelling_allowance ?? 0,
              other_allowance: record.other_allowance ?? data.allowances?.other_allowance ?? 0,
              other_deductions: record.other_deduction ?? data.other_deduction ?? 0,
              employer_epf: record.employer_epf ?? data.contribution?.epf_amount ?? 0,
              employer_etf: record.employer_etf ?? data.contribution?.etf_amount ?? 0
            },
            contribution: {
              epf_amount: record.employer_epf ?? data.contribution?.epf_amount ?? 0,
              etf_amount: record.employer_etf ?? data.contribution?.etf_amount ?? 0
            }
          };
        });

      const completeRecords = records.filter(record => record.payroll.status?.trim().toLowerCase() === 'complete');
      if (!completeRecords.length) {
        setDownloadError('No Complete payroll records were found for this month.');
        return;
      }

      setBatchPayslips(completeRecords);
      await new Promise(resolve => requestAnimationFrame(resolve));
      for (const record of completeRecords) {
        const element = batchPaperRefs.current[record.employee.id];
        if (element) await createPayslipPdf(element, record.employee, selectedMonth);
      }
    } catch (error) {
      console.error('Failed to download all payslips:', error);
      setDownloadError('Unable to download all payslips. Please try again.');
    } finally {
      setIsDownloading(false);
      setBatchPayslips([]);
      batchPaperRefs.current = {};
    }
  };

  return (
    <div className="payslips-page fade-in">
      <div className="payslips-toolbar">
        <div>
          <h1 className="disp">Payslips</h1>
          <p>Generate and review a payroll statement for an employee.</p>
        </div>
        <div className="payslip-actions">
          {/* <button className="btn-secondary" onClick={() => window.print()}><Printer size={15} /> Print</button> */}
          <button
            className="btn-secondary"
            onClick={handleDownloadAll}
            disabled={!selectedMonth || !payslipOptions.length || isDownloading}
            title="Download all Complete payslips for the selected month"
          >
            <Download size={15} /> {isDownloading ? 'Creating PDFs...' : 'Download All'}
          </button>
          <button
            className="btn-primary"
            onClick={handleDownloadPdf}
            disabled={!payrollIsComplete || isDownloading}
            title={!payrollIsComplete ? 'PDF download is available after payroll status is Complete' : 'Download payslip PDF'}
          >
            <Download size={15} /> {isDownloading ? 'Creating PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {payroll && !payrollIsComplete && (
        <div className="payslip-status-message">Download is available only when this payroll is marked Complete. Current status: {payroll.status || 'Unknown'}.</div>
      )}
      {downloadError && <div className="payslip-status-message error">{downloadError}</div>}

      <div className="payslip-filters stub">
        <div className="form-group">
          <label className="form-label">Employee</label>
          <select className="input-style" value={selectedEmployeeId} onChange={event => setSelectedEmployeeId(event.target.value)}>
            <option value="">Select employee</option>
            {employees.map(item => <option key={item.id} value={item.employee_id}>{item.full_name} - {item.employee_id}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label"><Calendar size={14} /> Payroll month</label>
          <select className="input-style" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} disabled={!months.length}>
            <option value="">Select month</option>
            {months.map(item => {
              const value = `${item.year}-${String(item.month).padStart(2, '0')}`;
              return <option key={value} value={value}>{new Date(`${value}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' })}</option>;
            })}
          </select>
        </div>
      </div>

      <PayslipPaper
        ref={payslipPaperRef}
        company={company}
        logoUrl={logoUrl}
        employee={employee}
        monthLabel={monthLabel}
        summary={summary}
        basicPay={basicPay}
        salaryStructure={salaryStructure}
        payroll={payroll}
        contribution={contribution}
      />

      <div className="batch-payslips-renderer" aria-hidden="true">
        {batchPayslips.map(record => (
          <PayslipPaper
            key={record.employee.id}
            ref={element => { batchPaperRefs.current[record.employee.id] = element; }}
            company={company}
            logoUrl={logoUrl}
            employee={record.employee}
            monthLabel={monthLabel}
            summary={record.summary}
            basicPay={record.basicPay}
            salaryStructure={record.salaryStructure}
            payroll={record.payroll}
            contribution={record.contribution}
          />
        ))}
      </div>

      {!payroll && <div className="payslip-empty"><FileText size={30} /><span>Select an employee and month with a generated payroll record.</span></div>}
    </div>
  );
};

export default PayslipsPage;

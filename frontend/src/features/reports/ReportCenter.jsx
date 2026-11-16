import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { reportsForRole, months, sum, isTotalColumn, derivedRows } from './reportDefinitions';
import exportReportPdf from './exportReportPdf';
import './ReportsPage.css';

export default function ReportCenter() {
  const { api, user } = useAuth();
  const reports = reportsForRole(user?.role);
  const now = new Date();
  const [filters, setFilters] = useState({ type: user?.role==='HR'?'attendance':'payroll', year: now.getFullYear(), month: now.getMonth() + 1,
    date:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`, employee: '', department: '' });
  const [options, setOptions] = useState({ employees: [], departments: [] });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [optionError, setOptionError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [retry, setRetry] = useState(0);
  const report = reports.find(item => item.id === filters.type);
  const query = useMemo(()=>filters.type==='daily-attendance'
    ? {type:filters.type,date:filters.date,employee:filters.employee,department:filters.department}
    : {type:filters.type,year:filters.year,month:filters.month,employee:filters.employee,department:filters.department},[filters]);
  const rows = useMemo(() => derivedRows(result?.rows || []), [result]);
  const ready = !loading && !error && result && Object.keys(query).every(key => String(result.filters[key]) === String(query[key]));
  useEffect(() => {
    let active = true;
    setOptionError('');
    api.get('/reports/options').then(response => { if (active) setOptions(response.data); })
      .catch(() => { if (active) setOptionError('Employee and department filters could not load. Please retry.'); });
    return () => { active = false; };
  }, [api, retry]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setExportError(''); setResult(null);
    api.get('/reports', { params: query }).then(response => { if (active) setResult(response.data); })
      .catch(error => { if (active) setError(error.response?.data?.message || 'Unable to load this report. Check your connection and try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, query, retry]);
  const change = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value, ...(event.target.name === 'department' ? { employee: '' } : {}) }));
  const departmentName = options.departments.find(item => item.department_id === filters.department)?.department_name || filters.department || 'All departments';
  const period = report.daily ? filters.date : `${filters.year}-${String(filters.month).padStart(2, '0')}`;
  const context = `${period} | ${departmentName} | ${filters.employee || 'All employees'}`;
  const download = () => {
    if (!ready || !rows.length) return;
    setExporting(true); setExportError('');
    try { exportReportPdf(report, rows, context); }
    catch { setExportError('PDF export failed. Please try again.'); }
    finally { setExporting(false); }
  };
  return <div className="payroll-reports">
    <div className="report-tabs" role="tablist" aria-label="Report type">
      {reports.map((item, index) => <button type="button" role="tab" aria-selected={item.id === filters.type} aria-controls="report-result" id={`tab-${item.id}`} key={item.id} onClick={() => setFilters(current => ({ ...current, type: item.id }))} className={item.id === filters.type ? 'selected' : ''}><span>0{index + 1}</span>{item.title}</button>)}
    </div>
    <div className="overview-panel report-filters">
      {report.daily ? <label>Attendance date<input type="date" name="date" min="1900-01-01" max="9999-12-31" value={filters.date} onChange={change} required /></label> : <>
        <label>Month<select name="month" value={filters.month} onChange={change}>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
        <label>Year<input type="number" name="year" min="1900" max="9999" value={filters.year} onChange={change} /></label>
      </>}
      <label>Department<select name="department" value={filters.department} onChange={change}><option value="">All departments</option>{options.departments.map(item => <option key={item.department_id} value={item.department_id}>{item.department_name}</option>)}</select></label>
      <label>Employee ID<select name="employee" value={filters.employee} onChange={change}><option value="">All employees</option>{options.employees.map(item => <option key={item.employee_id} value={item.employee_id}>{item.employee_id} — {item.full_name}</option>)}</select></label>
    </div>
    {optionError && <p role="alert" className="report-error">{optionError} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
    {exportError && <p role="alert" className="report-error">{exportError}</p>}
    <article id="report-result" role="tabpanel" aria-labelledby={`tab-${filters.type}`} className="overview-panel overview-table-panel" aria-busy={loading}>
      <div className="overview-panel-heading"><div><p className="overview-panel-label">{report.daily?filters.date:`${months[Number(filters.month) - 1]} ${filters.year}`}</p><h2>{report.title}</h2><p className="report-description">{report.description}</p></div><button type="button" className="overview-primary-button" onClick={download} disabled={!ready || !rows.length || exporting}><Download size={15} />{exporting ? 'Exporting…' : 'Download PDF'}</button></div>
      {error ? <p role="alert" className="report-error">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></p> : loading ? <p role="status" className="overview-empty">Loading report…</p> : ready && <>
        <div className="overview-table-scroll"><table className="overview-table report-data-table"><caption className="report-table-caption">{context}{report.hoursOnly?' | Attendance and hours':' | Amounts in Rs'}</caption><thead><tr>{report.columns.map(column => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={`${row.employee_code}-${index}`}>{report.columns.map(column => <td key={column.key} className={column.format !== String ? 'overview-money' : ''}>{column.format(row[column.key] ?? null)}</td>)}</tr>)}
            {!rows.length && <tr><td colSpan={report.columns.length} className="overview-empty">No {report.id === 'payslips' ? 'generated payslips' : 'records'} found for these filters.</td></tr>}
          </tbody>
          {!!rows.length && <tfoot><tr>{report.columns.map((column, index) => <td key={column.key}>{index === 0 ? 'Total' : index === 1 ? `${rows.length} records` : isTotalColumn(column) ? column.format(sum(rows, column.key)) : ''}</td>)}</tr></tfoot>}
        </table></div>
        <p className="report-note">{rows.length} records · Missing values are shown as —. Totals include recorded values only. {report.daily && 'Only saved attendance records are included; missing entries are not counted as absences. Working hours include overtime. Departments reflect current assignments.'}{report.id === 'attendance' && 'Present days include late arrivals. No-pay days follow the stored monthly attendance summary.'}{report.id === 'overtime' && !report.hoursOnly && 'Rates use the payroll snapshot when available; legacy records use the current salary structure.'}{report.id === 'payroll' && 'Basic salary uses the saved payroll snapshot. Legacy records may contain adjusted basic pay.'}{report.id === 'payslips' && 'Salary for EPF reflects late and no-pay adjustments; payroll deductions include EPF, APIT and other deductions. PDF export shows individual employee breakdowns.'}</p>
      </>}
    </article>
  </div>;
}

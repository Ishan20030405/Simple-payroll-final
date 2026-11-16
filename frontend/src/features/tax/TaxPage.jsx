// src/features/tax/TaxPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt, AlertCircle, Search, ChevronRight,
  TrendingUp, Users, BadgePercent, Calculator, RefreshCw, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import '../dashboard/ManagementOverview.css';
import './TaxPage.css';

const formatCurrency = (v) =>
  `Rs ${(Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TaxPage = () => {
  const { api } = useAuth();
  const [taxBrackets, setTaxBrackets] = useState([]);
  const [taxSummary, setTaxSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [calcMessage, setCalcMessage] = useState(null); // { type: 'success'|'error', text }
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [expandedRow, setExpandedRow] = useState(null); // employee_id for breakdown

  // ---- Load data ----
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [taxRes, summaryRes] = await Promise.all([
        api.get('/tax-settings'),
        api.get('/tax-settings/summary')
      ]);
      setTaxBrackets(taxRes.data?.data || []);
      const rows = summaryRes.data?.data || [];
      setTaxSummary(rows);
      if (rows.length > 0 && !selectedMonth) {
        setSelectedMonth(rows[0].month_year?.split('T')[0] || '');
      }
    } catch (err) {
      console.error('Failed to load tax data:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  // ---- Calculate & Save APIT ----
  const handleCalculate = async () => {
    setCalculating(true);
    setCalcMessage(null);
    try {
      const res = await api.post('/tax-settings/calculate', { month_year: selectedMonth });
      if (res.data.success) {
        setCalcMessage({ type: 'success', text: res.data.message });
        await loadData();
      }
    } catch (err) {
      setCalcMessage({ type: 'error', text: err.response?.data?.message || 'Calculation failed.' });
    } finally {
      setCalculating(false);
      setTimeout(() => setCalcMessage(null), 5000);
    }
  };

  // ---- Filter rows by selected month + search ----
  const filteredRows = taxSummary.filter(r => {
    const rowMonth = r.month_year?.split('T')[0] || r.month_year || '';
    const matchMonth = !selectedMonth || rowMonth === selectedMonth;
    const matchSearch = !search ||
      r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.emp_code?.toLowerCase().includes(search.toLowerCase());
    return matchMonth && matchSearch;
  });

  // ---- Summary stats for selected month ----
  const totalGross   = filteredRows.reduce((s, r) => s + Number(r.gross_salary || 0), 0);
  const totalAPIT    = filteredRows.reduce((s, r) => s + Number(r.apit_tax || 0), 0);
  const taxableCount = filteredRows.filter(r => Number(r.apit_tax) > 0).length;
  const effectiveRate = totalGross > 0 ? ((totalAPIT / totalGross) * 100).toFixed(2) : '0.00';

  // Unique months
  const months = [...new Set(
    taxSummary.map(r => r.month_year?.split('T')[0] || r.month_year).filter(Boolean)
  )];

  const monthLabel = (m) => {
    try { return new Date(m).toLocaleString('en-US', { month: 'long', year: 'numeric' }); }
    catch { return m; }
  };

  return (
    <section className="overview-page fade-in">

      {/* ---- Header ---- */}
      <div className="overview-heading">
        <div>
          <p className="overview-kicker">Payroll / Tax</p>
          <h1 className="overview-title">Tax</h1>
          <p className="overview-subtitle">APIT/PAYE progressive calculation based on configured tax brackets.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="tax-month-select"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            <option value="">All months</option>
            {months.map(m => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>

          <button
            className="tax-calculate-btn"
            onClick={handleCalculate}
            disabled={calculating || !selectedMonth}
          >
            {calculating
              ? <><RefreshCw size={15} className="spin" /> Calculating...</>
              : <><Calculator size={15} /> Calculate &amp; Save APIT</>
            }
          </button>
        </div>
      </div>

      {/* ---- Calc feedback ---- */}
      {calcMessage && (
        <div className={`tax-alert ${calcMessage.type}`}>
          {calcMessage.type === 'success'
            ? <CheckCircle2 size={15} />
            : <AlertCircle size={15} />
          }
          {calcMessage.text}
        </div>
      )}

      {/* ---- Stat Cards ---- */}
      <div className="overview-stat-grid overview-report-stats">
        <article className="overview-stat-card">
          <div className="overview-stat-top">
            <span>Employees</span>
            <span className="overview-icon steel"><Users size={17} /></span>
          </div>
          <strong>{loading ? '...' : filteredRows.length}</strong>
          <span className="overview-stat-note muted">In selected period</span>
        </article>

        <article className="overview-stat-card">
          <div className="overview-stat-top">
            <span>Taxable employees</span>
            <span className="overview-icon amber"><AlertCircle size={17} /></span>
          </div>
          <strong>{loading ? '...' : taxableCount}</strong>
          <span className="overview-stat-note muted">APIT applicable</span>
        </article>

        <article className="overview-stat-card">
          <div className="overview-stat-top">
            <span>Total APIT deducted</span>
            <span className="overview-icon blue"><Receipt size={17} /></span>
          </div>
          <strong>{loading ? '...' : formatCurrency(totalAPIT)}</strong>
          <span className="overview-stat-note muted">Saved in database</span>
        </article>

        <article className="overview-stat-card overview-stat-wide">
          <div className="overview-stat-top">
            <span>Effective tax rate</span>
            <span className="overview-icon green"><BadgePercent size={17} /></span>
          </div>
          <strong>{loading ? '...' : `${effectiveRate}%`}</strong>
          <span className="overview-stat-note">
            <span className="overview-live-dot" /> Average across filtered employees
          </span>
        </article>
      </div>

      {/* ---- Main grid ---- */}
      <div className="tax-content-grid">

        {/* Employee APIT Table */}
        <article className="overview-panel tax-table-panel">
          <div className="overview-panel-heading">
            <div>
              <p className="overview-panel-label">APIT Breakdown</p>
              <h2>Employee tax summary — {selectedMonth ? monthLabel(selectedMonth) : 'All months'}</h2>
            </div>
            <Calculator size={18} />
          </div>

          {/* Search */}
          <div className="tax-search-bar">
            <Search size={15} className="tax-search-icon" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="overview-report-department-table-wrap">
            <table className="overview-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Month</th>
                  <th>Gross Salary</th>
                  <th>APIT (Rs)</th>
                  <th>Net After APIT</th>
                  <th>Status</th>
                  <th>Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="8" className="overview-empty">Loading...</td></tr>
                )}
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan="8" className="overview-empty">
                      No data. Click <strong>Calculate &amp; Save APIT</strong> to generate.
                    </td>
                  </tr>
                )}
                {!loading && filteredRows.map((row, idx) => {
                  const apit = Number(row.apit_tax || 0);
                  const gross = Number(row.gross_salary || 0);
                  const netAfterTax = gross - apit;
                  const isExpanded = expandedRow === idx;

                  // Build bracket breakdown for this employee
                  const breakdown = taxBrackets.map(b => {
                    const text = (b.monthly_salary_range || '').toLowerCase().replace(/,/g, '');
                    let min = 0, max = Infinity;
                    if (text.startsWith('up to') || text.startsWith('0')) {
                      max = parseFloat(text.match(/[\d.]+/g)?.pop()) || 100000;
                    } else if (text.startsWith('over') || text.startsWith('above')) {
                      min = parseFloat(text.match(/[\d.]+/g)?.[0]) || 308333;
                    } else {
                      const nums = text.match(/[\d.]+/g) || [];
                      min = parseFloat(nums[0]) || 0;
                      if (nums.length >= 2) {
                        max = parseFloat(nums[1]);
                      } else {
                        max = Infinity;
                      }
                    }
                    if (gross <= min) return null;
                    const taxableAmt = Math.min(gross, max === Infinity ? gross : max) - min;
                    const rate = parseFloat(b.tax_rate) / 100;
                    const taxAmt = taxableAmt * rate;
                    return { range: b.monthly_salary_range, rate: b.tax_rate, taxableAmt, taxAmt };
                  }).filter(Boolean);

                  return (
                    <React.Fragment key={idx}>
                      <tr>
                        <td><strong>{row.full_name}</strong></td>
                        <td className="overview-money">{row.emp_code}</td>
                        <td>{monthLabel(row.month_year?.split('T')[0] || row.month_year)}</td>
                        <td className="overview-money">{formatCurrency(gross)}</td>
                        <td className="overview-money" style={{ fontWeight: 700, color: apit > 0 ? '#e05c47' : 'inherit' }}>
                          {formatCurrency(apit)}
                        </td>
                        <td className="overview-money">{formatCurrency(netAfterTax)}</td>
                        <td>
                          <span className={`overview-status ${apit > 0 ? 'inactive' : 'active'}`}>
                            {apit > 0 ? 'Taxable' : 'Exempt'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="tax-expand-btn"
                            onClick={() => setExpandedRow(isExpanded ? null : idx)}
                          >
                            {isExpanded ? '▲ Hide' : '▼ Show'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="tax-breakdown-row">
                          <td colSpan="8">
                            <div className="tax-breakdown-box">
                              <p className="tax-breakdown-title">Progressive APIT Slab Breakdown</p>
                              <table className="tax-breakdown-table">
                                <thead>
                                  <tr>
                                    <th>Salary Range</th>
                                    <th>Taxable Amount</th>
                                    <th>Rate</th>
                                    <th>Tax</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {breakdown.map((b, i) => (
                                    <tr key={i}>
                                      <td>{b.range}</td>
                                      <td>{formatCurrency(b.taxableAmt)}</td>
                                      <td>{b.rate}%</td>
                                      <td style={{ fontWeight: 600, color: b.taxAmt > 0 ? '#e05c47' : '#388e3c' }}>
                                        {formatCurrency(b.taxAmt)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td colSpan="3"><strong>Total APIT</strong></td>
                                    <td style={{ fontWeight: 700, color: '#e05c47' }}>
                                      <strong>{formatCurrency(apit)}</strong>
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {!loading && filteredRows.length > 0 && (
                <tfoot>
                  <tr className="tax-total-row">
                    <td colSpan="3"><strong>Total</strong></td>
                    <td className="overview-money"><strong>{formatCurrency(totalGross)}</strong></td>
                    <td className="overview-money" style={{ fontWeight: 700, color: '#e05c47' }}>
                      <strong>{formatCurrency(totalAPIT)}</strong>
                    </td>
                    <td className="overview-money"><strong>{formatCurrency(totalGross - totalAPIT)}</strong></td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </article>

        {/* Brackets Reference Panel */}
        <article className="overview-panel tax-brackets-panel">
          <div className="overview-panel-heading">
            <div>
              <p className="overview-panel-label">Reference</p>
              <h2>APIT Brackets</h2>
            </div>
            <TrendingUp size={18} />
          </div>

          <div className="tax-brackets-list">
            {taxBrackets.length === 0 && !loading && (
              <p className="overview-empty">No brackets. Go to Settings → Tax Settings.</p>
            )}
            {taxBrackets.map((b, i) => (
              <div key={i} className="tax-bracket-row">
                <div className="tax-bracket-range">
                  <ChevronRight size={13} />
                  <span>{b.monthly_salary_range}</span>
                </div>
                <span className={`tax-bracket-rate ${
                  Number(b.tax_rate) === 0 ? 'rate-zero'
                  : Number(b.tax_rate) <= 12 ? 'rate-low'
                  : Number(b.tax_rate) <= 24 ? 'rate-mid'
                  : 'rate-high'
                }`}>
                  {b.tax_rate}%
                </span>
              </div>
            ))}
          </div>

          <div className="tax-how-it-works">
            <p className="tax-how-title">How progressive tax works</p>
            <p className="tax-how-body">
              Each salary slab is taxed at its own rate. For example, a salary of <strong>Rs 183,334</strong> pays:
            </p>
            <ul className="tax-how-list">
              <li>Rs 100,000 × 0% = <strong>Rs 0</strong></li>
              <li>Rs 41,667 × 6% = <strong>Rs 2,500</strong></li>
              <li>Rs 41,667 × 12% = <strong>Rs 5,000</strong></li>
            </ul>
          </div>

          <div className="tax-note">
            <AlertCircle size={13} />
            <span>Configure brackets in <strong>Settings → Tax Settings</strong>. Click <strong>Calculate &amp; Save APIT</strong> to update all records.</span>
          </div>
        </article>
      </div>
    </section>
  );
};

export default TaxPage;

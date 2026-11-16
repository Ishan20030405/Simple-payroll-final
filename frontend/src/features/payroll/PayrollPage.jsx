import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './PayrollPage.css';

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return `Rs ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ')}`;
};

const PayrollPage = () => {
  const { api } = useAuth();
  const [workflowTick, setWorkflowTick] = useState(0);
  const [runMonth, setRunMonth] = useState(new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0'));
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [payrollMonths, setPayrollMonths] = useState([]);
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState('');
  const [daysWorked, setDaysWorked] = useState('');
  const [noPayDays, setNoPayDays] = useState('');
  const [lateHours, setLateHours] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [basicPay, setBasicPay] = useState('');
  const [noPayAmount, setNoPayAmount] = useState('');
  const [lateAmount, setLateAmount] = useState('');
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [normalOtRate, setNormalOtRate] = useState('');
  const [sundayOtRate, setSundayOtRate] = useState('');
  const [normalOtHours, setNormalOtHours] = useState('');
  const [sundayOtHours, setSundayOtHours] = useState('');
  const [allowances, setAllowances] = useState({});
  const [epf, setEpf] = useState('');
  const [otherDeduction, setOtherDeduction] = useState('');
  const [apitTax, setApitTax] = useState('');
  const [payrollRecord, setPayrollRecord] = useState(null);
  const [payslipRecord, setPayslipRecord] = useState(null);
  const [employerContribution, setEmployerContribution] = useState(null);
  const [payrollSettings, setPayrollSettings] = useState({ epf_percentage: 12, etf_percentage: 3 });
  const [isEditingPayroll, setIsEditingPayroll] = useState(false);
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);
  const [payslipMode, setPayslipMode] = useState('All');
  const [payslipMonth, setPayslipMonth] = useState('');
  const [payslipEmployeeId, setPayslipEmployeeId] = useState('');
  const [payslipDepartment, setPayslipDepartment] = useState('');
  const [payslipDesignation, setPayslipDesignation] = useState('');
  const [payslipMonths, setPayslipMonths] = useState([]);
  const [payslipOptions, setPayslipOptions] = useState([]);
  const [payslipGenerationOptions, setPayslipGenerationOptions] = useState([]);
  const [isGeneratingPayslips, setIsGeneratingPayslips] = useState(false);
  const [payslipMessage, setPayslipMessage] = useState('');
  const [payslipError, setPayslipError] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get('/employees');
        const activeEmployees = response.data.filter(employee => employee.status === 'Active');
        setEmployees(activeEmployees);
        setSelectedEmployeeId(current=>activeEmployees.some(item=>item.employee_id===current)?current:activeEmployees[0]?.employee_id||'');
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      }
    };

    fetchEmployees();
  }, [api, workflowTick]);

  useEffect(() => {
    const fetchPayslipMonths = async () => {
      try {
        const [savedResponse, generationResponse] = await Promise.all([
          api.get('/payslips/options'),
          api.get('/payslips/generation-options')
        ]);
        const options = savedResponse.data || [];
        const generationOptions = generationResponse.data || [];
        setPayslipOptions(options);
        setPayslipGenerationOptions(generationOptions);
        const months = [...new Set(
          generationOptions
            .map(payroll => String(payroll.month_year_text || payroll.month_year || '').slice(0, 10))
            .filter(month => /^\d{4}-\d{2}-\d{2}$/.test(month))
        )].sort((firstMonth, secondMonth) => secondMonth.localeCompare(firstMonth));
        setPayslipMonths(months);
        setPayslipMonth(current => current && months.includes(current) ? current : months[0] || '');
      } catch (error) {
        console.error('Failed to fetch payslip months:', error);
      }
    };
    fetchPayslipMonths();
  }, [api, workflowTick]);

  const payslipEmployees = [...new Map(
    payslipGenerationOptions
      .filter(option => option.employee_id && option.employee_code)
      .map(option => [option.employee_id, option])
  ).values()];
  const payslipDepartments = [...new Set(payslipGenerationOptions.map(option => option.department).filter(Boolean))];
  const payslipDesignations = [...new Set(payslipGenerationOptions.map(option => option.designation).filter(Boolean))];

  useEffect(() => {
    const fetchSalaryStructures = async () => {
      try {
        const response = await api.get('/salary-structures');
        setSalaryStructures(response.data);
      } catch (error) {
        console.error('Failed to fetch salary structures:', error);
      }
    };

    fetchSalaryStructures();
  }, [api, workflowTick]);

  useEffect(() => {
    const fetchPayrollSettings = async () => {
      try {
        const response = await api.get('/payroll-settings');
        setPayrollSettings({
          epf_percentage: Number(response.data?.epf_percentage ?? 12),
          etf_percentage: Number(response.data?.etf_percentage ?? 3)
        });
      } catch (error) {
        console.error('Failed to fetch payroll settings:', error);
      }
    };

    fetchPayrollSettings();
  }, [api, workflowTick]);

  useEffect(() => {
    let active = true;
    const fetchPayrollMonths = async () => {
      if (!selectedEmployeeId) {
        setPayrollMonths([]);
        setSelectedPayrollMonth('');
        return;
      }

      try {
        const response = await api.get(`/attendance/summary-months/${selectedEmployeeId}`);
        if (!active) return;
        setPayrollMonths(response.data);
        const firstMonth = response.data[0];
        setSelectedPayrollMonth(current=>response.data.some(item=>`${item.year}-${String(item.month).padStart(2,'0')}`===current)?current:firstMonth?`${firstMonth.year}-${String(firstMonth.month).padStart(2,'0')}`:'');
      } catch (error) {
        if (!active) return;
        console.error('Failed to fetch payroll months:', error);
        setPayrollMonths([]);
        setSelectedPayrollMonth('');
      }
    };

    fetchPayrollMonths();
    return () => { active = false; };
  }, [api, selectedEmployeeId, workflowTick]);

  useEffect(() => {
    let active=true;
    setIsEditingPayroll(false);setPayrollRecord(null);setPayslipRecord(null);setEmployerContribution(null);setIsLoadingPayroll(false);
    setBasicSalary('');setBasicPay('');setDaysWorked('');setNoPayDays('');setLateHours('');setNoPayAmount('');setLateAmount('');setEpf('');setNormalOtRate('');setSundayOtRate('');setNormalOtHours('');setSundayOtHours('');setAllowances({});setOtherDeduction('');setApitTax('');
    const employee=employees.find(item=>item.employee_id===selectedEmployeeId);
    if(!employee?.id||!selectedPayrollMonth)return ()=>{active=false;};
    setIsLoadingPayroll(true);
    (async()=>{
      try{
        const response=await api.get(`/payrolls/employee/${employee.id}/month/${selectedPayrollMonth}-01`);
        const payroll=response.data;
        let data=typeof payroll.payroll_data==='string'?JSON.parse(payroll.payroll_data||'{}'):(payroll.payroll_data||{});
        if(!Object.keys(data).length){
          try{const slip=await api.get(`/payslips/employee/${employee.id}/month/${selectedPayrollMonth}-01`);const saved=slip.data;data={...saved,...(typeof saved.payroll_data==='string'?JSON.parse(saved.payroll_data||'{}'):saved.payroll_data)};}catch{}
        }
        if(!active)return;
        setPayrollRecord(payroll);setPayslipRecord(Object.keys(data).length?data:null);
        setBasicSalary(data.basic_salary??'');setBasicPay(data.salary_for_epf??data.basic_salary??'');
        setDaysWorked(data.total_working_days??'');setNoPayDays(data.total_no_pay_days??'');setLateHours(data.total_late_hours??'');
        setNoPayAmount(data.no_pay_amount??'');setLateAmount(data.late_amount??'');setEpf(data.epf??'');
        setNormalOtRate(data.normal_ot_rate??'');setSundayOtRate(data.sunday_ot_rate??'');setNormalOtHours(data.normal_ot_hours??'');setSundayOtHours(data.sunday_ot_hours??'');
        setAllowances(data.allowances||{attendance_allowance:data.attendance_allowance??0,special_allowance:data.special_allowance??0,travelling_allowance:data.travelling_allowance??0,other_allowance:data.other_allowance??0});
        setOtherDeduction(data.other_deduction??'');setApitTax(payroll.apit_tax??data.apit_tax??0);
        setEmployerContribution({epf_amount:data.employer_epf??0,etf_amount:data.employer_etf??0});
      }catch(error){if(active)setPayslipError(error.response?.data?.message||'Unable to load payroll.');}
      finally{if(active)setIsLoadingPayroll(false);}
    })();
    return ()=>{active=false;};
  },[api,employees,selectedEmployeeId,selectedPayrollMonth,workflowTick]);

  const workflowAction=async action=>{
    const employee=employees.find(item=>item.employee_id===selectedEmployeeId);
    if(action==='reopen'&&!window.confirm('Reopen this payroll? Its payslip will be unavailable to the employee until it is approved again.'))return;
    setWorkflowBusy(true);setPayslipError('');setPayslipMessage('');
    try{
      let response;
      if(action==='calculate')response=await api.post('/payrolls/generate',{month_year:runMonth});
      else if(action==='tax')response=await api.post('/tax-settings/calculate',{month_year:selectedPayrollMonth});
      else if(action==='reopen')response=await api.post(`/payrolls/employee/${employee.id}/month/${selectedPayrollMonth}-01/reopen`);
      else response=await api.put(`/payrolls/employee/${employee.id}/month/${selectedPayrollMonth}-01`,{status:action==='approve'?'Complete':'Paid'});
      setPayslipMessage(response.data.message);setWorkflowTick(value=>value+1);
    }catch(error){setPayslipError(error.response?.data?.message||'Unable to complete payroll action.');}
    finally{setWorkflowBusy(false);}
  };

  const totalAllowances = Object.values(allowances).reduce(
    (total, amount) => total + (Number(amount) || 0),
    0
  );
  const normalOtAmount = Number(normalOtRate || 0) * Number(normalOtHours || 0);
  const sundayOtAmount = Number(sundayOtRate || 0) * Number(sundayOtHours || 0);
  const totalOtAmount = normalOtAmount + sundayOtAmount;
  const totalAdditions = totalAllowances + totalOtAmount;
  const totalDeductions = Number(epf || 0) + Number(otherDeduction || 0) + Number(apitTax || 0);
  const calculatedGrossSalary = Number(basicPay || 0) + totalAdditions;
  const calculatedNetSalary = calculatedGrossSalary - totalDeductions;
  const inputValue = (value) => isEditingPayroll ? (value ?? '') : (value === '' ? '' : formatCurrency(value));

  const handlePayrollAction = async () => {
    if (!payrollRecord || isLoadingPayroll || ['Complete','Paid'].includes(payrollRecord.status)) { setPayslipError('Select a draft payroll, or reopen completed payroll before editing.'); return; }
    if (!isEditingPayroll) {
      setPayslipMessage('');
      setPayslipError('');
      setIsEditingPayroll(true);
      return;
    }

    const selectedEmployee = employees.find(employee => employee.employee_id === selectedEmployeeId);
    if (!selectedEmployee?.id || !selectedPayrollMonth) return;
    if (!payrollRecord || ['complete','paid'].includes(payrollRecord.status?.toLowerCase())) {
      setPayslipError('Reopen completed payroll before editing. Paid payroll is locked.');
      return;
    }

    const normalOtAmount = Number(normalOtRate || 0) * Number(normalOtHours || 0);
    const sundayOtAmount = Number(sundayOtRate || 0) * Number(sundayOtHours || 0);
    const deductions = totalDeductions;
    const grossSalary = calculatedGrossSalary;

    setIsSavingPayroll(true);
    try {
      const payslipData = {
        basic_salary: Number(basicSalary || 0),
        total_allowances: totalAllowances,
        total_deductions: deductions,
        total_normal_ot_amount: normalOtAmount,
        total_sunday_ot_amount: sundayOtAmount,
        total_additions: totalAdditions,
        gross_salary: grossSalary,
        net_salary: grossSalary - deductions,
        total_working_days: Number(daysWorked || 0),
        total_no_pay_days: Number(noPayDays || 0),
        total_late_hours: Number(lateHours || 0),
        no_pay_amount: Number(noPayAmount || 0),
        late_amount: Number(lateAmount || 0),
        epf: Number(epf || 0),
        salary_for_epf: Number(basicPay || 0),
        other_deduction: Number(otherDeduction || 0),
        apit_tax: Number(apitTax || 0),
        normal_ot_rate: Number(normalOtRate || 0),
        normal_ot_hours: Number(normalOtHours || 0),
        sunday_ot_rate: Number(sundayOtRate || 0),
        sunday_ot_hours: Number(sundayOtHours || 0),
        allowances
      };
      await api.put(`/payslips/employee/${selectedEmployee.id}/month/${selectedPayrollMonth}-01`, payslipData);
      setPayslipRecord(prev => ({
        ...(prev || {}),
        ...payslipData,
        employee_id: selectedEmployee.id,
        month_year: selectedPayrollMonth
      }));
      setIsEditingPayroll(false);
      setPayslipError('');
      setPayslipMessage('Draft payroll saved. Recalculate tax, review and approve before generating payslips.');
      setWorkflowTick(value=>value+1);
    } catch (error) {
      console.error('Failed to save payslip:', error);
      setPayslipError(error.response?.data?.message || 'Failed to save payslip.');
    } finally {
      setIsSavingPayroll(false);
    }
  };

  const handleGeneratePayslips = async () => {
    if (!payslipMonth || isGeneratingPayslips) return;
    setIsGeneratingPayslips(true);
    setPayslipMessage('');
    setPayslipError('');
    try {
      const response = await api.post('/payslips/generate', {
        month_year: payslipMonth,
        mode: payslipMode,
        employee_id: payslipMode === 'One by one' ? payslipEmployeeId : undefined,
        department: payslipMode === 'department' ? payslipDepartment : undefined,
        designation: payslipMode === 'designation' ? payslipDesignation : undefined
      });
      setWorkflowTick(value=>value+1);
      const monthLabel = new Date(`${payslipMonth}T00:00:00`).toLocaleString('en-US', { month: 'long', year: 'numeric' });
      setPayslipMessage(`${response.data?.message || 'Payslips saved successfully'} for ${monthLabel} (${response.data?.saved || 0} saved). Only approved payrolls are saved.`);
    } catch (error) {
      setPayslipError(error.response?.data?.message || 'Failed to generate payslips');
    } finally {
      setIsGeneratingPayslips(false);
    }
  };

  return (
    <div className="payroll-page-wrapper view-section fade-in active">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="disp" style={{ fontSize: '24px', margin: '0 0 4px' }}>Payroll calculator</h1>
        <p style={{ color: 'var(--text-mute)', fontSize: '14px', margin: 0 }}>Compute gross and net pay for a single run.</p>
      </div>

      <div className="stub" style={{marginBottom:24}}>
        <h3>Payroll workflow</h3>
        <p style={{fontSize:13,color:'var(--text-mute)'}}>Calculate draft / Calculate tax / Review and approve / Generate payslip / Mark paid</p>
        <label>Calculation month <input type="month" value={runMonth} onChange={event=>setRunMonth(event.target.value)} /></label>
        <button className="btn-primary" disabled={workflowBusy||!runMonth} onClick={()=>workflowAction('calculate')}>Calculate draft payroll</button>
      </div>
      <div className="stub payslip-generator" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ledger)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '18px' }}>Payslip generate</h3>
        <div className="payslip-generator-fields">
          <div className="form-group">
            <label className="form-label">Payroll month</label>
            <select className="input-style" value={payslipMonth} onChange={event => setPayslipMonth(event.target.value)} disabled={!payslipMonths.length}>
              <option value="">Select a month</option>
              {payslipMonths.map(month => <option key={month} value={month}>{new Date(`${month}T00:00:00`).toLocaleString('en-US', { month: 'long', year: 'numeric' })}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Generate for</label>
            <select className="input-style" value={payslipMode} onChange={event => setPayslipMode(event.target.value)}>
              <option value="All">All</option>
              <option value="One by one">One by one</option>
              <option value="department">Department</option>
              <option value="designation">Designation</option>
            </select>
          </div>
          {payslipMode === 'One by one' && (
            <div className="form-group">
              <label className="form-label">Employee</label>
              <select className="input-style" value={payslipEmployeeId} onChange={event => setPayslipEmployeeId(event.target.value)}>
                <option value="">Select an employee</option>
                {payslipEmployees.map(employee => <option key={employee.employee_id} value={employee.employee_id}>{employee.employee_code} - {employee.employee_name}</option>)}
              </select>
            </div>
          )}
          {payslipMode === 'department' && (
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="input-style" value={payslipDepartment} onChange={event => setPayslipDepartment(event.target.value)}>
                <option value="">Select a department</option>
                {payslipDepartments.map(department => <option key={department} value={department}>{department}</option>)}
              </select>
            </div>
          )}
          {payslipMode === 'designation' && (
            <div className="form-group">
              <label className="form-label">Designation</label>
              <select className="input-style" value={payslipDesignation} onChange={event => setPayslipDesignation(event.target.value)}>
                <option value="">Select a designation</option>
                {payslipDesignations.map(designation => <option key={designation} value={designation}>{designation}</option>)}
              </select>
            </div>
          )}
        </div>
        <button className="btn-primary" onClick={handleGeneratePayslips} disabled={isGeneratingPayslips || !payslipMonth}>
          {isGeneratingPayslips ? 'Generating payslips...' : 'Generate payslip'}
        </button>
        {payslipMessage && <p className="payslip-generator-message success">{payslipMessage}</p>}
        {payslipError && <p className="payslip-generator-message error">{payslipError}</p>}
      </div>

      <div className="stub" style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:24}}>
        <span>Selected payroll: {isLoadingPayroll?'Loading...':payrollRecord?.status||'Select an employee and month'}</span>
        <button className="btn-primary" disabled={workflowBusy||!payrollRecord||['Complete','Paid'].includes(payrollRecord.status)} onClick={()=>workflowAction('tax')}>Calculate month tax</button>
        <button className="btn-primary" disabled={workflowBusy||!payrollRecord?.tax_calculated||['Complete','Paid'].includes(payrollRecord?.status)} onClick={()=>workflowAction('approve')}>Approve payroll</button>
        <button className="btn-primary" disabled={workflowBusy||payrollRecord?.status!=='Complete'} onClick={()=>workflowAction('reopen')}>Reopen payroll</button>
        <button className="btn-primary" disabled={workflowBusy||payrollRecord?.status!=='Complete'||!payslipOptions.some(row=>Number(row.employee_id)===Number(payrollRecord?.employee_id)&&String(row.month_year_text||row.month_year).slice(0,7)===selectedPayrollMonth)} onClick={()=>workflowAction('paid')}>Mark paid</button>
      </div>
      <div className="payslip-editor" style={{ marginBottom: '24px' }}>
        <h2 className="disp" style={{ fontSize: '20px', margin: '0 0 4px' }}>Draft payroll editor</h2>
        <p style={{ color: 'var(--text-mute)', fontSize: '13px', margin: 0 }}>
          Select an employee and payroll month below, then use the Edit draft button at the bottom to update the payslip values.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Data Entry Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Employee Settings */}
          <div className="stub">
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '18px' }}>Employee</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <select
                  className="input-style"
                  value={selectedEmployeeId}
                  onChange={(event) => setSelectedEmployeeId(event.target.value)}
                  disabled={isEditingPayroll}
                >
                  <option value="" disabled>Select an employee</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.employee_id}>
                      {employee.employee_id} - {employee.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payroll month</label>
                <select
                  className="input-style"
                  value={selectedPayrollMonth}
                  onChange={(event) => setSelectedPayrollMonth(event.target.value)}
                  disabled={isEditingPayroll || payrollMonths.length === 0}
                >
                  <option value="" disabled>Select a month</option>
                  {payrollMonths.map(({ year, month }) => (
                    <option key={`${year}-${month}`} value={`${year}-${String(month).padStart(2, '0')}`}>
                      {new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Scheduled working days</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={daysWorked}
                  placeholder="Select employee and month"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="stub">
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ledger)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '18px' }}>Earnings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div className="form-group">
                <label className="form-label">Basic salary</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(basicSalary)}
                  onChange={(event) => setBasicSalary(event.target.value)}
                  placeholder="Select an employee"
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Salary for EPF</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(basicPay)}
                  onChange={(event) => setBasicPay(event.target.value)}
                  placeholder="Select employee and month"
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group">
                <label className="form-label">No pay days</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={noPayDays}
                  onChange={(event) => setNoPayDays(event.target.value)}
                  placeholder="Select employee and month"
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group">
                <label className="form-label">No pay amount</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(noPayAmount)}
                  onChange={(event) => setNoPayAmount(event.target.value)}
                  placeholder="Select employee and month"
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Late hours</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={lateHours}
                  onChange={(event) => setLateHours(event.target.value)}
                  placeholder="Select employee and month"
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Late amount</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(lateAmount)}
                  onChange={(event) => setLateAmount(event.target.value)}
                  placeholder="Select employee and month"
                  readOnly={!isEditingPayroll}
                />
              </div>
            </div>
          </div>

          {/* Overtime */}
          <div className="stub">
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '18px' }}>Overtime</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div className="form-group">
                <label className="form-label">Normal OT rate</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(normalOtRate)}
                  onChange={(event) => setNormalOtRate(event.target.value)}
                  placeholder="Select an employee"
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Normal OT hrs</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={normalOtHours}
                  onChange={(event) => setNormalOtHours(event.target.value)}
                  placeholder="Select employee and month"
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Sunday OT rate</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(sundayOtRate)}
                  onChange={(event) => setSundayOtRate(event.target.value)}
                  placeholder="Select an employee"
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Sunday OT hrs</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={sundayOtHours}
                  onChange={(event) => setSundayOtHours(event.target.value)}
                  placeholder="Select employee and month"
                  readOnly={!isEditingPayroll}
                />
              </div>
            </div>
          </div>

          {/* Allowances */}
          <div className="stub">
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '18px' }}>Allowances</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div className="form-group">
                <label className="form-label">Attendance allowance</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(allowances.attendance_allowance)}
                  onChange={(event) => setAllowances(prev => ({ ...prev, attendance_allowance: event.target.value }))}
                  placeholder="Select an employee"
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Special allowance</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(allowances.special_allowance)}
                  onChange={(event) => setAllowances(prev => ({ ...prev, special_allowance: event.target.value }))}
                  placeholder="Select an employee"
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Travelling allowance</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(allowances.travelling_allowance)}
                  onChange={(event) => setAllowances(prev => ({ ...prev, travelling_allowance: event.target.value }))}
                  placeholder="Select an employee"
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Other allowance</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(allowances.other_allowance)}
                  onChange={(event) => setAllowances(prev => ({ ...prev, other_allowance: event.target.value }))}
                  placeholder="Select an employee"
                  readOnly={!isEditingPayroll}
                />
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="stub">
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--coral)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '18px' }}>Deductions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">EPF</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(epf)}
                  onChange={(event) => setEpf(event.target.value)}
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Other deduction</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(otherDeduction)}
                  placeholder="Select an employee"
                  onChange={(event) => setOtherDeduction(event.target.value)}
                  readOnly={!isEditingPayroll}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">APIT Tax</label>
                <input
                  type="text"
                  className="input-style mono"
                  value={inputValue(apitTax)}
                  onChange={(event) => setApitTax(event.target.value)}
                  readOnly={!isEditingPayroll}
                />
              </div>
            </div>
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '12px 20px', fontSize: '14.5px' }}
              onClick={handlePayrollAction}
              disabled={isSavingPayroll || isLoadingPayroll || !payrollRecord || ['Complete','Paid'].includes(payrollRecord.status)}
            >
              {isSavingPayroll ? 'Saving payslip...' : isEditingPayroll ? 'Save draft' : 'Edit draft'}
            </button>
            {isEditingPayroll && !isSavingPayroll && <span className="payslip-editor-hint">Change values, then click Save payslip.</span>}
            {payslipMessage && <span className="payslip-editor-message success">{payslipMessage}</span>}
            {payslipError && <span className="payslip-editor-message error">{payslipError}</span>}
          </div>
          
        </div>

        {/* Right Column: Summary Panel */}
        <div className="stub" style={{ position: 'sticky', top: 0 }}>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '20px' }}>Summary</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Basic Salary</span><span className="mono">{basicSalary === '' ? formatCurrency(0) : formatCurrency(basicSalary)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>No Pay Days</span><span className="mono">{noPayDays || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>No Pay Amount</span><span className="mono">{noPayAmount === '' ? formatCurrency(0) : formatCurrency(noPayAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Late Hours</span><span className="mono">{lateHours || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Late Amount</span><span className="mono">{lateAmount === '' ? formatCurrency(0) : formatCurrency(lateAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Salary for EPF</span><span className="mono">{basicPay === '' ? formatCurrency(0) : formatCurrency(basicPay)}</span>
            </div>

            {/* Overtime Section */}
            <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '12px 0 4px' }}>Overtime</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', fontSize: '11px', fontWeight: 600, color: 'var(--text-mute)' }}>
              <div>Desc</div><div style={{ textAlign: 'right' }}>Rate</div><div style={{ textAlign: 'right' }}>Hrs</div><div style={{ textAlign: 'right' }}>Amt</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', fontSize: '13px' }}>
              <div>Normal OT</div><div className="mono" style={{ textAlign: 'right' }}>{formatCurrency(normalOtRate)}</div><div className="mono" style={{ textAlign: 'right' }}>{normalOtHours || 0}</div><div className="mono" style={{ textAlign: 'right' }}>{formatCurrency(normalOtAmount)}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', fontSize: '13px' }}>
              <div>Sunday OT</div><div className="mono" style={{ textAlign: 'right' }}>{formatCurrency(sundayOtRate)}</div><div className="mono" style={{ textAlign: 'right' }}>{sundayOtHours || 0}</div><div className="mono" style={{ textAlign: 'right' }}>{formatCurrency(sundayOtAmount)}</div>
            </div>

            <div style={{ borderBottom: '1px dashed var(--line)', margin: '6px 0' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Attendance Allowance</span><span className="mono">{formatCurrency(allowances.attendance_allowance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Special Allowance</span><span className="mono">{formatCurrency(allowances.special_allowance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Travelling Allowance</span><span className="mono">{formatCurrency(allowances.travelling_allowance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Other Allowance</span><span className="mono">{formatCurrency(allowances.other_allowance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Total OT Amount</span><span className="mono">{formatCurrency(totalOtAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Total Additions</span><span className="mono">{formatCurrency(totalAdditions)}</span>
            </div>

            <div style={{ borderBottom: '1px dashed var(--line)', margin: '6px 0' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px' }}>
              <span>Gross Salary</span><span className="mono">{formatCurrency(calculatedGrossSalary)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span>EPF</span><span className="mono">{epf === '' ? formatCurrency(0) : formatCurrency(epf)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Other Deduction</span><span className="mono">{otherDeduction === '' ? formatCurrency(0) : formatCurrency(otherDeduction)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Total Deduction</span><span className="mono">{formatCurrency(totalDeductions)}</span>
            </div>

            <div style={{ borderBottom: '1px dashed var(--line)', margin: '6px 0' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '18px', color: 'var(--ledger)', margin: '4px 0' }}>
              <span>Net salary</span><span className="mono">{formatCurrency(calculatedNetSalary)}</span>
            </div>

            <div style={{ borderBottom: '1px dashed var(--line)', margin: '6px 0' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-mute)' }}>
              <span>EPF {payrollSettings.epf_percentage}% (Employer)</span><span className="mono">{formatCurrency(employerContribution?.epf_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-mute)' }}>
              <span>ETF {payrollSettings.etf_percentage}% (Employer)</span><span className="mono">{formatCurrency(employerContribution?.etf_amount)}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default PayrollPage;

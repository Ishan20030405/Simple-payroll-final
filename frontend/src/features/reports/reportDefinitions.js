const money = value => value == null ? '—' : Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = value => value == null ? '—' : Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
const col = (key, label, format = money) => ({ key, label, format });
const identity = [col('employee_code', 'Employee ID', String), col('employee_name', 'Employee name', String), col('department_name', 'Department', String)];
export const reports = [
  { id: 'payroll', title: 'Monthly Payroll Report', description: 'Basic salary, overtime, allowances, deductions, gross salary, and net salary.', columns: [
    ...identity, col('basic_salary', 'Basic salary'), col('total_normal_ot_amount', 'Normal OT'), col('total_sunday_ot_amount', 'Sunday OT'), col('total_allowances', 'Allowances'), col('total_deductions', 'Deductions'), col('gross_salary', 'Gross salary'), col('net_salary', 'Net salary')
  ] },
  { id: 'payslips', title: 'Employee Payslip Report', description: 'Generated payslips with allowances, EPF, deductions, and final net salary.', individual: true, columns: [
    ...identity, col('basic_salary', 'Basic salary'), col('attendance_allowance', 'Attendance allowance'), col('special_allowance', 'Special allowance'), col('travelling_allowance', 'Travel allowance'), col('other_allowance', 'Other allowance'), col('total_normal_ot_amount', 'Normal OT'), col('total_sunday_ot_amount', 'Sunday OT'), col('no_pay_amount', 'No-pay deduction'), col('late_amount', 'Late deduction'), col('epf', 'Employee EPF'), col('apit_tax', 'APIT tax'), col('other_deduction', 'Other deduction'), col('total_deductions', 'Payroll deductions'), col('gross_salary', 'Gross salary'), col('net_salary', 'Net salary')
  ] },
  { id: 'attendance', title: 'Monthly Attendance Report', description: 'Working days, present days, absences, leave, late hours, and no-pay days.', columns: [
    ...identity, col('working_days', 'Working days', number), col('present_days', 'Present days', number), col('absent_days', 'Absent days', number), col('leave_days', 'Leave days', number), col('late_hours', 'Late hours', number), col('no_pay_days', 'No-pay days', number)
  ] },
  { id: 'overtime', title: 'Overtime (OT) Report', description: 'Normal and Sunday overtime hours, saved rates, recorded payments, and monthly totals.', columns: [
    ...identity, col('normal_ot_hours', 'Normal hours', number), col('normal_ot_rate', 'Normal rate'), col('total_normal_ot_amount', 'Normal payment'), col('sunday_ot_hours', 'Sunday hours', number), col('sunday_ot_rate', 'Sunday rate'), col('total_sunday_ot_amount', 'Sunday payment'), col('total_ot_payment', 'Total OT payment')
  ] },
  { id: 'contributions', title: 'EPF & ETF Report', description: 'Employee EPF, employer EPF, and employer ETF contributions.', columns: [
    ...identity, col('employee_epf', 'Employee EPF'), col('employer_epf', 'Employer EPF'), col('employer_etf', 'Employer ETF'), col('total_contributions', 'Total contributions')
  ] },
  { id: 'daily-attendance', title: 'Daily Attendance Report', daily: true, hoursOnly: true,
    description: 'Recorded attendance, check-in/out times, working hours and overtime for one day.', columns: [
      ...identity, col('date','Date',String), col('status','Status',String),
      {...col('check_in','Check-in',value=>value==null?'—':String(value).slice(0,5)),total:false},
      {...col('check_out','Check-out',value=>value==null?'—':String(value).slice(0,5)),total:false},
      col('working_hours','Working hours',number), col('overtime_hours','OT hours',number)
    ] }
];
export const months = Array.from({ length: 12 }, (_, index) => new Date(2000, index, 1).toLocaleString('en-US', { month: 'long' }));
export const reportsForRole = role => role==='HR' ? reports.filter(item=>['attendance','overtime','daily-attendance'].includes(item.id)).map(item=>({...item,hoursOnly:true,
  description:item.id==='overtime'?'Normal and Sunday overtime hours by employee.':item.description,
  columns:item.id==='overtime'?[...identity,col('normal_ot_hours','Normal OT hours',number),col('sunday_ot_hours','Sunday OT hours',number)]:item.columns
})) : reports;
export const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
export const isTotalColumn = column => column.total !== false && column.format !== String && !column.key.endsWith('_rate');
export const derivedRows = rows => rows.map(row => ({ ...row,
  total_ot_payment: row.total_normal_ot_amount == null || row.total_sunday_ot_amount == null ? null : Number(row.total_normal_ot_amount) + Number(row.total_sunday_ot_amount),
  total_contributions: row.employee_epf == null || row.employer_epf == null || row.employer_etf == null ? null : Number(row.employee_epf) + Number(row.employer_epf) + Number(row.employer_etf)
}));

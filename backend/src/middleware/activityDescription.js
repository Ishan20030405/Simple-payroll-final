const clean = value => typeof value === 'string' || typeof value === 'number' ? String(value).replace(/[\r\n\t]/g, ' ').slice(0, 120) : '';
const resources = { employees: 'employee record', attendance: 'attendance record', payrolls: 'payroll', payslips: 'payslip', departments: 'department', designations: 'designation', 'salary-structures': 'salary structure', 'payroll-settings': 'payroll settings', 'tax-settings': 'tax settings', 'company-information': 'company information', 'employer-epf-etf': 'employer contributions', 'monthly-salary-expenses': 'monthly salary expenses', reports: 'report' };
const fields = { fullName: 'name', email: 'email', phone: 'phone', department: 'department', designation: 'designation', status: 'status', address: 'address', joinDate: 'joining date', dob: 'date of birth', userRole: 'account type', basic_salary: 'basic salary', basicSalary: 'basic salary', check_in: 'check-in time', check_out: 'check-out time', username: 'username', is_active: 'account status', password: 'password', initialPassword: 'initial password', newPassword: 'password', company_name: 'company name', employeeId: 'employee code' };

module.exports = req => {
  const parts = (req.originalUrl || req.path || req.url || '').split('?')[0].split('/').filter(Boolean).map(part => { try { return decodeURIComponent(part); } catch { return part; } });
  if (parts[0] === 'api') parts.shift();
  const [resource, operation] = parts;
  const body = req.body || {}, query = req.query || {};
  const verb = req.method === 'GET' ? 'Viewed' : req.method === 'POST' ? 'Added' : req.method === 'DELETE' ? 'Deleted' : 'Updated';
  let action = `${verb} ${resources[resource] || 'system record'}`;
  const context = [];
  if (resource === 'auth') {
    action = ({ login: 'Requested sign-in verification', 'verify-otp': 'Verified sign-in code', logout: 'Signed out', me: 'Viewed own profile', 'profile-picture': req.method === 'DELETE' ? 'Removed own profile picture' : 'Updated own profile picture', 'change-password': 'Changed own password', update: 'Updated user account', register: 'Created user account', 'register-user': 'Created employee login account' })[operation] || 'Used account services';
    if (operation === 'update' && parts[2]) context.push(`User account #${clean(parts[2])}`);
  } else {
    if (resource === 'employees' && operation && !['stats', 'search'].includes(operation)) context.push(`Employee record #${clean(operation)}`);
    if (resource === 'attendance' && operation === 'bulk') action = 'Imported attendance records';
    if (resource === 'attendance' && operation && /^\d+$/.test(operation)) context.push(`Attendance record #${operation}`);
    const employeeIndex = parts.indexOf('employee');
    if (employeeIndex >= 0 && parts[employeeIndex + 1]) context.push(`Employee record #${clean(parts[employeeIndex + 1])}`);
    if (resource === 'payrolls' && operation === 'generate') action = 'Calculated draft payroll';
    if (resource === 'payrolls' && parts.includes('reopen')) action = 'Reopened payroll';
    if (resource === 'payrolls' && body.status === 'Complete') action = 'Approved payroll';
    if (resource === 'company-information' && operation === 'reset') action = 'Reset company information';
    if (resource === 'company-information' && operation === 'logo') action = 'Updated company logo';
    if (resource === 'reports' && query.type) context.push(`Report: ${clean(query.type)}`);
    if (resources[resource] && !['employees', 'attendance', 'payrolls', 'payslips', 'company-information', 'reports'].includes(resource) && operation && /^\d+$/.test(operation)) context.push(`Record #${operation}`);
  }
  if (body.fullName) context.push(`Employee: ${clean(body.fullName)}`);
  if (body.employeeId || body.employee_id) context.push(`Employee code/ID: ${clean(body.employeeId || body.employee_id)}`);
  const monthIndex = parts.indexOf('month');
  const month = body.month_year || body.monthYear || query.month_year || query.monthYear || (monthIndex >= 0 ? parts[monthIndex + 1] : '');
  if (month) context.push(`Payroll month: ${clean(month)}`);
  if (body.date || query.date) context.push(`Date: ${clean(body.date || query.date)}`);
  if (req.method !== 'GET') {
    const submitted = [...new Set(Object.keys(body).map(key => fields[key]).filter(Boolean))];
    if (submitted.length) context.push(`Submitted fields: ${submitted.join(', ')}`);
    if (typeof body.status === 'string') context.push(`Requested status: ${clean(body.status)}`);
  }
  return { action, details: context.length ? context.join(' · ') : req.method === 'GET' ? 'Opened this information in the workspace.' : 'Applied to the selected record or settings.' };
};

const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
function amount(value, label = 'Amount') {
    const number = Number(value);
    if (value === '' || value == null || !Number.isFinite(number) || number < 0) fail(`${label} must be a non-negative number`);
    return number;
}
function dateOnly(value) {
    if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    const text = String(value || '').slice(0, 10);
    const date = new Date(`${text}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) fail('A valid date is required');
    return text;
}
function monthDate(value) { return `${dateOnly(String(value).length === 7 ? `${value}-01` : value).slice(0, 7)}-01`; }
function timeMinutes(value) {
    if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(value))) fail('Time must use HH:MM or HH:MM:SS');
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
}
function attendance(data, settings) {
    const date = dateOnly(data.date);
    const requested = data.status || 'Present';
    if (!['Present', 'Late', 'Absent', 'Leave', 'Holiday'].includes(requested)) fail('Invalid attendance status');
    if (['Absent', 'Leave', 'Holiday'].includes(requested)) return { date, check_in: null, check_out: null, working_minutes: 0, overtime_minutes: 0, working_hours: 0, overtime: 0, status: requested };
    if (!data.check_in || !data.check_out) fail('Check-in and check-out are required for present attendance');
    const start = timeMinutes(data.check_in);
    const end = timeMinutes(data.check_out);
    const minutes = end >= start ? end - start : end + 1440 - start;
    const sunday = new Date(`${date}T12:00:00Z`).getUTCDay() === 0;
    const overtime = sunday ? minutes : Math.max(0, minutes - Math.round(Number(settings.working_hours || 8) * 60));
    return { date, check_in: data.check_in, check_out: data.check_out, working_minutes: sunday ? 0 : minutes, overtime_minutes: overtime,
        working_hours: money((sunday ? 0 : minutes) / 60), overtime: money(overtime / 60),
        status: start > timeMinutes(settings.check_in_time || '09:00') ? 'Late' : 'Present' };
}
function salary(data) {
    const allowances = Object.fromEntries(['attendance_allowance', 'special_allowance', 'travelling_allowance', 'other_allowance'].map(key => [key, money(amount(data.allowances?.[key] ?? data[key] ?? 0, key))]));
    const basic = amount(data.basic_salary ?? 0, 'Basic salary');
    const noPay = amount(data.no_pay_amount ?? 0);
    const late = amount(data.late_amount ?? 0);
    const base = Math.max(0, money(data.salary_for_epf == null ? basic - noPay - late : amount(data.salary_for_epf, 'Salary for EPF')));
    const normalHours = data.normal_ot_minutes == null ? amount(data.normal_ot_hours ?? 0) : amount(data.normal_ot_minutes)/60;
    const sundayHours = data.sunday_ot_minutes == null ? amount(data.sunday_ot_hours ?? 0) : amount(data.sunday_ot_minutes)/60;
    const normal = money(normalHours * amount(data.normal_ot_rate ?? 0));
    const sunday = money(sundayHours * amount(data.sunday_ot_rate ?? 0));
    const totalAllowances = money(Object.values(allowances).reduce((total, value) => total + value, 0));
    const tax = money(amount(data.apit_tax ?? 0));
    const epf = money(amount(data.epf ?? 0));
    const other = money(amount(data.other_deduction ?? 0));
    const additions = money(totalAllowances + normal + sunday);
    const gross = money(base + additions);
    const deductions = money(epf + other + tax);
    return { ...data, normal_ot_hours: normalHours, sunday_ot_hours: sundayHours, ...allowances, allowances, basic_salary: money(basic), salary_for_epf: base, no_pay_amount: money(noPay), late_amount: money(late),
        epf, other_deduction: other, apit_tax: tax, total_allowances: totalAllowances, total_normal_ot_amount: normal,
        total_sunday_ot_amount: sunday, total_additions: additions, gross_salary: gross, total_deductions: deductions, net_salary: money(gross - deductions) };
}
module.exports = { money, amount, dateOnly, monthDate, timeMinutes, attendance, salary };

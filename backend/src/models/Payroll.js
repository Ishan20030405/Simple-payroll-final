const db = require('../config/db');
const math = require('../utils/payrollMath');
const locked = message => { throw Object.assign(new Error(message), { status: 409 }); };

class Payroll {
    static async getAll() {
        const [rows] = await db.execute(`SELECT p.*, e.full_name, e.employee_id AS employee_code, e.department,
            d.department_name FROM payrolls p LEFT JOIN employees e ON e.id=p.employee_id
            LEFT JOIN departments d ON d.department_id=e.department ORDER BY p.month_year DESC, p.created_at DESC`);
        return rows;
    }
    static async getMonths() {
        const [rows] = await db.execute("SELECT DISTINCT DATE_FORMAT(month_year, '%Y-%m-%d') AS month_year FROM payrolls ORDER BY month_year DESC");
        return rows;
    }
    static async findByKey(employeeId, monthYear) {
        const [rows] = await db.execute(`SELECT p.*, e.full_name, e.employee_id AS employee_code, e.department
            FROM payrolls p JOIN employees e ON e.id=p.employee_id WHERE p.employee_id=? AND p.month_year=?`, [employeeId, math.monthDate(monthYear)]);
        return rows[0] || null;
    }
    static async findByEmployeeId(employeeId) {
        const [rows] = await db.execute('SELECT * FROM payrolls WHERE employee_id=? ORDER BY month_year DESC', [employeeId]);
        return rows;
    }
    static async findByEmployeeAndMonth(employeeId, monthYear) { return this.findByKey(employeeId, monthYear); }
    static async getGenerationRows(monthYear) {
        const month=math.monthDate(monthYear);
        const [rows]=await db.execute(`SELECT DISTINCT e.id AS employee_id,e.department,e.designation,? AS month_year
            FROM attendance a JOIN employees e ON e.id=a.employee_id
            WHERE YEAR(a.date)=YEAR(?) AND MONTH(a.date)=MONTH(?) ORDER BY e.id`,[month,month,month]);
        return rows;
    }
    static async assertEditable(employeeId, monthYear) {
        await db.execute('SELECT id FROM employees WHERE id=? FOR UPDATE', [employeeId]);
        const [rows] = await db.execute('SELECT * FROM payrolls WHERE employee_id=? AND month_year=? FOR UPDATE', [employeeId, math.monthDate(monthYear)]);
        if (rows[0] && ['complete','paid'].includes(String(rows[0].status).toLowerCase())) locked('This payroll is locked. Reopen completed payroll before making changes. Paid payroll cannot be reopened.');
        return rows[0] || null;
    }
    static async recalculate(employeeId, monthYear) {
        const month = math.monthDate(monthYear);
        const existing = await this.assertEditable(employeeId, month);
        const [rows] = await db.execute(`SELECT e.employee_id AS employee_code, e.full_name AS employee_name,
            e.department, e.designation, d.department_name,
            ss.basic_pay AS basic_salary, ss.attendance_allowance, ss.special_allowance, ss.travelling_allowance,
            ss.other_allowance, ss.normal_ot_rate, ss.sunday_ot_rate, ss.other_deductions AS other_deduction,
            bp.net_basic_pay AS salary_for_epf, bp.no_pay_amount, bp.late_amount, bp.epf,
            s.total_working_days, (SELECT COUNT(*) FROM attendance a WHERE a.employee_id=e.id AND YEAR(a.date)=s.year AND MONTH(a.date)=s.month AND a.status IN ('Present','Late')) AS days_present, s.total_no_pay_days, s.total_late_hours, s.total_ot_hours AS normal_ot_hours,
            s.total_sunday_working_hours AS sunday_ot_hours,
            (SELECT SUM(COALESCE(a.overtime_minutes,ROUND(FLOOR(a.overtime)*60+(a.overtime-FLOOR(a.overtime))*100))) FROM attendance a WHERE a.employee_id=e.id AND YEAR(a.date)=s.year AND MONTH(a.date)=s.month AND DAYOFWEEK(a.date)<>1) AS normal_ot_minutes,
            (SELECT SUM(COALESCE(a.overtime_minutes,ROUND(FLOOR(a.overtime)*60+(a.overtime-FLOOR(a.overtime))*100))) FROM attendance a WHERE a.employee_id=e.id AND YEAR(a.date)=s.year AND MONTH(a.date)=s.month AND DAYOFWEEK(a.date)=1) AS sunday_ot_minutes,
            c.epf_amount AS employer_epf, c.etf_amount AS employer_etf
            FROM employees e LEFT JOIN departments d ON d.department_id=e.department
            JOIN employee_monthly_attendance_summary s ON s.employee_id=e.employee_id AND s.year=YEAR(?) AND s.month=MONTH(?)
            JOIN basic_pay bp ON bp.employee_id=e.employee_id AND bp.year=s.year AND bp.month=s.month
            JOIN salary_structures ss ON ss.department=e.department AND ss.designation=e.designation AND ss.status='Active'
            LEFT JOIN employer_epf_etf c ON c.employee_id=e.id AND c.year=s.year AND c.month=s.month
            WHERE e.id=?`, [month, month, employeeId]);
        if (!rows[0]) locked('Attendance summary and an active salary structure are required to calculate payroll.');
        const data = math.salary({ ...rows[0], apit_tax: 0 });
        data.revision = require('node:crypto').randomUUID();
        const fields = ['total_allowances','total_deductions','total_normal_ot_amount','total_sunday_ot_amount','total_additions','gross_salary','net_salary','apit_tax'];
        await db.execute(`INSERT INTO payrolls (employee_id, month_year, ${fields.join(',')}, status, payroll_data, tax_calculated)
            VALUES (?, ?, ${fields.map(()=>'?').join(',')}, 'Pending', ?, FALSE)
            ON DUPLICATE KEY UPDATE ${fields.map(key=>`${key}=VALUES(${key})`).join(',')},
                status='Pending', payroll_data=VALUES(payroll_data), tax_calculated=FALSE`,
            [employeeId, month, ...fields.map(key=>data[key]), JSON.stringify(data)]);
        return { employee_id: employeeId, month_year: month, ...data, status: 'Pending', previous_status: existing?.status };
    }
    static async create(data) { return this.recalculate(data.employee_id, data.month_year); }
    static async update(employeeId, monthYear, data) {
        const month = math.monthDate(monthYear);
        await db.execute('SELECT id FROM employees WHERE id=? FOR UPDATE', [employeeId]);
        const existing = await this.findByKey(employeeId, month);
        if (!existing) return false;
        if (existing.status === 'Paid') locked('Paid payroll is locked.');
        if (data.status === 'Paid') {
            if (existing.status !== 'Complete') locked('Approve payroll and generate its payslip before marking it paid.');
            const [slips] = await db.execute('SELECT id, payroll_data FROM payslips WHERE employee_id=? AND month_year=?', [employeeId, month]);
            const parse = value => typeof value === 'string' ? JSON.parse(value || '{}') : (value || {});
            const current = parse(existing.payroll_data), generated = parse(slips[0]?.payroll_data);
            if (!slips.length || !current.revision || current.revision !== generated.revision) locked('Generate the current approved payslip before marking payroll paid.');
            await db.execute("UPDATE payrolls SET status='Paid' WHERE employee_id=? AND month_year=?", [employeeId, month]);
            return true;
        }
        if (data.status === 'Complete') {
            if (!existing.tax_calculated) locked('Calculate tax for this payroll month before approval, including zero-tax payroll.');
            await db.execute("UPDATE payrolls SET status='Complete' WHERE employee_id=? AND month_year=?", [employeeId, month]);
            return true;
        }
        locked('Use the payroll calculation, draft payslip editor, or Reopen action to change payroll.');
    }
    static async reopen(employeeId, monthYear) {
        const month = math.monthDate(monthYear);
        await db.execute('SELECT id FROM employees WHERE id=? FOR UPDATE', [employeeId]);
        const row = await this.findByKey(employeeId, month);
        if (!row) return false;
        if (row.status === 'Paid') locked('Paid payroll cannot be reopened.');
        if (row.status !== 'Complete') locked('Only completed payroll can be reopened.');
        await db.execute("UPDATE payrolls SET status='Pending', tax_calculated=FALSE WHERE employee_id=? AND month_year=?", [employeeId, month]);
        await require('./MonthlySalaryExpense').recalculate(month);
        return true;
    }
    static async delete(employeeId, monthYear) {
        const month = math.monthDate(monthYear);
        await this.assertEditable(employeeId, month);
        await db.execute('DELETE FROM payslips WHERE employee_id=? AND month_year=?', [employeeId, month]);
        const [result] = await db.execute('DELETE FROM payrolls WHERE employee_id=? AND month_year=?', [employeeId, month]);
        await require('./MonthlySalaryExpense').recalculate(month);
        return result.affectedRows > 0;
    }
    static async findByMonth(monthYear) {
        const [rows] = await db.execute('SELECT * FROM payrolls WHERE month_year=? ORDER BY employee_id', [math.monthDate(monthYear)]);
        return rows;
    }
}
module.exports = Payroll;

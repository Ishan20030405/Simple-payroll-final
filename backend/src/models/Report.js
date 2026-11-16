const db = require('../config/db');

const types = ['payroll', 'payslips', 'attendance', 'overtime', 'contributions', 'daily-attendance'];

function validateFilters(query) {
    const { type, year, month, employee = '', department = '' } = query;
    if (!types.includes(type)) throw new Error('Select a valid report.');
    if (typeof employee !== 'string' || employee.length > 50 || typeof department !== 'string' || department.length > 100) {
        throw new Error('Invalid employee or department filter.');
    }
    if (type === 'daily-attendance') {
        const { date } = query;
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number(date.slice(0,4)) < 1900) throw new Error('Select a valid attendance date (YYYY-MM-DD).');
        const parsed = new Date(`${date}T12:00:00Z`);
        if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date) throw new Error('Select a valid attendance date (YYYY-MM-DD).');
        return { type, date, employee, department };
    }
    if (!/^\d{4}$/.test(String(year)) || Number(year) < 1900 || Number(year) > 9999) {
        throw new Error('Enter a valid year.');
    }
    if (!/^\d{1,2}$/.test(String(month)) || Number(month) < 1 || Number(month) > 12) {
        throw new Error('Select a valid month.');
    }
    return { type, year: Number(year), month: Number(month), employee, department };
}

class Report {
    static async options() {
        const [employees] = await db.execute('SELECT employee_id, full_name, department FROM employees ORDER BY employee_id');
        const [departments] = await db.execute('SELECT department_id, department_name FROM departments ORDER BY department_name');
        return { employees, departments };
    }

    static async getRows({ type, year, month, date, employee, department }) {
        if (type === 'daily-attendance') {
            const filters = ['a.date = ?'];
            const values = [date];
            if (employee) { filters.push('e.employee_id = ?'); values.push(employee); }
            if (department) { filters.push('e.department = ?'); values.push(department); }
            const minutes = (exact,legacy) => `COALESCE(${exact},ROUND(FLOOR(${legacy})*60+(${legacy}-FLOOR(${legacy}))*100))`;
            const [rows] = await db.execute(`SELECT e.employee_id AS employee_code, e.full_name AS employee_name,
                e.department, COALESCE(d.department_name,e.department,'Unassigned') AS department_name,
                DATE_FORMAT(a.date,'%Y-%m-%d') AS date, a.status, a.check_in, a.check_out,
                (CASE WHEN DAYOFWEEK(a.date)=1 THEN ${minutes('a.overtime_minutes','a.overtime')}
                    ELSE ${minutes('a.working_minutes','a.working_hours')} END)/60 AS working_hours,
                ${minutes('a.overtime_minutes','a.overtime')}/60 AS overtime_hours
                FROM attendance a JOIN employees e ON e.id=a.employee_id
                LEFT JOIN departments d ON d.department_id=e.department
                WHERE ${filters.join(' AND ')} ORDER BY e.employee_id`,values);
            return rows;
        }
        const period = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextPeriod = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const filters = [];
        const params = [];
        if (employee) { filters.push(type === 'payslips' ? 'p.employee_code = ?' : 'e.employee_id = ?'); params.push(employee); }
        if (department) { filters.push(type === 'payslips' ? 'p.department = ?' : `COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${type==='contributions'?'ledger':'p'}.payroll_data,'$.department')),e.department) = ?`); params.push(department); }
        const identity = `e.employee_id AS employee_code, e.full_name AS employee_name,
            e.department, COALESCE(d.department_name, e.department, 'Unassigned') AS department_name`;
        const directory = 'INNER JOIN employees e ON e.id = p.employee_id LEFT JOIN departments d ON d.department_id = e.department';
        let sql;
        let values;
        if (type === 'payslips') {
            sql = `SELECT p.*, p.payroll_data AS snapshot, p.employee_code, p.employee_name,
                COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p.payroll_data,'$.department_name')), d.department_name, p.department, 'Unassigned') AS department_name
                FROM payslips p INNER JOIN employees e ON e.id=p.employee_id LEFT JOIN departments d ON d.department_id=p.department
                INNER JOIN payrolls approved ON approved.employee_id=p.employee_id AND approved.month_year=p.month_year AND approved.status IN ('Complete','Paid')
                AND JSON_UNQUOTE(JSON_EXTRACT(approved.payroll_data,'$.revision')) <=> JSON_UNQUOTE(JSON_EXTRACT(p.payroll_data,'$.revision'))
                WHERE p.month_year >= ? AND p.month_year < ?`;
            values = [period, nextPeriod];
        } else if (type === 'payroll') {
            sql = `SELECT ${identity}, p.payroll_data AS snapshot, COALESCE(JSON_EXTRACT(p.payroll_data,'$.basic_salary'),bp.net_basic_pay) AS basic_salary,
                p.total_normal_ot_amount, p.total_sunday_ot_amount,
                p.total_allowances, p.total_deductions, p.gross_salary, p.net_salary, p.status
                FROM payrolls p ${directory}
                LEFT JOIN basic_pay bp ON bp.employee_id = e.employee_id
                    AND bp.year = YEAR(p.month_year) AND bp.month = MONTH(p.month_year)
                WHERE p.month_year >= ? AND p.month_year < ?`;
            values = [period, nextPeriod];
        } else if (type === 'contributions') {
            sql = `SELECT ${identity}, ledger.payroll_data AS snapshot, COALESCE(JSON_EXTRACT(ledger.payroll_data,'$.epf'),bp.epf) AS employee_epf,
                COALESCE(JSON_EXTRACT(ledger.payroll_data,'$.employer_epf'),eet.epf_amount) AS employer_epf, COALESCE(JSON_EXTRACT(ledger.payroll_data,'$.employer_etf'),eet.etf_amount) AS employer_etf
                FROM (
                    SELECT e.id AS employee_id FROM basic_pay bp JOIN employees e ON e.employee_id = bp.employee_id WHERE bp.year = ? AND bp.month = ?
                    UNION SELECT employee_id FROM employer_epf_etf WHERE year = ? AND month = ?
                ) p ${directory}
                LEFT JOIN basic_pay bp ON bp.employee_id = e.employee_id AND bp.year = ? AND bp.month = ?
                LEFT JOIN employer_epf_etf eet ON eet.employee_id = e.id AND eet.year = ? AND eet.month = ?
                LEFT JOIN payrolls ledger ON ledger.employee_id=e.id AND ledger.month_year=DATE(CONCAT(COALESCE(bp.year,eet.year),'-',LPAD(COALESCE(bp.month,eet.month),2,'0'),'-01'))
                WHERE 1 = 1`;
            values = [year, month, year, month, year, month, year, month];
        } else {
            // Group raw records once per employee; Late counts as a present day.
            sql = `SELECT ${identity}, p.payroll_data AS snapshot, a.present_days, a.absent_days, a.leave_days,
                s.total_working_days AS working_days, s.total_late_hours AS late_hours,
                s.total_no_pay_days AS no_pay_days, a.normal_ot_hours, a.sunday_ot_hours,
                COALESCE(JSON_EXTRACT(p.payroll_data,'$.normal_ot_rate'),ss.normal_ot_rate) AS normal_ot_rate, COALESCE(JSON_EXTRACT(p.payroll_data,'$.sunday_ot_rate'),ss.sunday_ot_rate) AS sunday_ot_rate,
                p.total_normal_ot_amount, p.total_sunday_ot_amount
                FROM (
                    SELECT employee_id,
                        SUM(status IN ('Present', 'Late')) AS present_days,
                        SUM(status = 'Absent') AS absent_days,
                        SUM(status = 'Leave') AS leave_days,
                        SUM(CASE WHEN DAYOFWEEK(date) <> 1 THEN COALESCE(overtime_minutes,ROUND(FLOOR(overtime)*60+(overtime-FLOOR(overtime))*100))/60 ELSE 0 END) AS normal_ot_hours,
                        SUM(CASE WHEN DAYOFWEEK(date) = 1 THEN COALESCE(overtime_minutes,ROUND(FLOOR(overtime)*60+(overtime-FLOOR(overtime))*100))/60 ELSE 0 END) AS sunday_ot_hours
                    FROM attendance WHERE date >= ? AND date < ? GROUP BY employee_id
                ) a
                INNER JOIN employees e ON e.id = a.employee_id
                LEFT JOIN departments d ON d.department_id = e.department
                LEFT JOIN employee_monthly_attendance_summary s ON s.employee_id = e.employee_id AND s.year = ? AND s.month = ?
                LEFT JOIN salary_structures ss ON ss.id = (
                    SELECT ss2.id FROM salary_structures ss2
                    WHERE (ss2.department = e.department OR ss2.department = CONCAT('DEP-', e.department))
                        AND ss2.designation = e.designation
                    ORDER BY (ss2.status = 'Active') DESC, ss2.id DESC LIMIT 1
                )
                LEFT JOIN payrolls p ON p.employee_id = e.id AND p.month_year >= ? AND p.month_year < ?
                WHERE 1 = 1`;
            values = [period, nextPeriod, year, month, period, nextPeriod];
        }
        if (filters.length) sql += ` AND ${filters.join(' AND ')}`;
        sql += ' ORDER BY e.employee_id';
        const [rows] = await db.execute(sql, [...values, ...params]);
        return rows.map(row => {
            const saved = typeof row.snapshot === 'string' ? JSON.parse(row.snapshot || '{}') : row.snapshot;
            if (!saved) return row;
            return { ...row, employee_name: saved.employee_name || row.employee_name,
                department_name: saved.department_name || row.department_name,
                ...(type === 'payroll' ? { basic_salary: saved.basic_salary } : {}),
                ...(type === 'payslips' ? {...saved.allowances, apit_tax:saved.apit_tax??0} : {}) };
        });
    }
}

module.exports = { Report, validateFilters };

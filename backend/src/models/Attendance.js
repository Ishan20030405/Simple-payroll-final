const db = require('../config/db');
const Payroll = require('./Payroll');
const math = require('../utils/payrollMath');
const duration = (minutes, legacy) => `COALESCE(${minutes}, ROUND(FLOOR(${legacy})*60+(${legacy}-FLOOR(${legacy}))*100))`;
class Attendance {
    static async findById(id) {
        const [rows] = await db.execute(`SELECT a.*, ${duration('a.working_minutes','a.working_hours')}/60 AS working_hours, ${duration('a.overtime_minutes','a.overtime')}/60 AS overtime, a.employee_id AS employee_db_id, DATE_FORMAT(a.date,'%Y-%m-%d') AS date,
            e.employee_id AS employee_id, e.employee_id AS employee_code, e.full_name, e.department FROM attendance a
            JOIN employees e ON e.id=a.employee_id WHERE a.id=?`, [id]);
        return rows[0] || null;
    }
    static async getByDate(date) {
        const [rows] = await db.execute(`SELECT a.*, ${duration('a.working_minutes','a.working_hours')}/60 AS working_hours, ${duration('a.overtime_minutes','a.overtime')}/60 AS overtime, a.employee_id AS employee_db_id, e.employee_id AS employee_id, e.employee_id AS employee_code,
            e.full_name, e.department FROM attendance a JOIN employees e ON e.id=a.employee_id
            WHERE a.date=? ORDER BY e.full_name`, [math.dateOnly(date)]);
        return rows;
    }
    static async getByEmployeeAndDate(employeeId,date) {
        const [rows] = await db.execute('SELECT * FROM attendance WHERE employee_id=? AND date=?',[employeeId,date]);
        return rows[0] || null;
    }
    static async create(data) {
        await Payroll.assertEditable(data.employee_id, data.date);
        const [result] = await db.execute(`INSERT INTO attendance
            (employee_id,date,check_in,check_out,working_minutes,overtime_minutes,working_hours,overtime,status)
            VALUES (?,?,?,?,?,?,?,?,?)`, [data.employee_id,data.date,data.check_in,data.check_out,data.working_minutes,data.overtime_minutes,data.working_hours,data.overtime,data.status]);
        await this.refreshMonthlySummary(data.employee_id,data.date);
        return result.insertId;
    }
    static async refreshMonthlySummary(employeeId,date) {
        const month=math.monthDate(date);
        await Payroll.assertEditable(employeeId,month);
        const [counts]=await db.execute('SELECT COUNT(*) AS count FROM attendance WHERE employee_id=? AND YEAR(date)=YEAR(?) AND MONTH(date)=MONTH(?)',[employeeId,month,month]);
        if (!Number(counts[0].count)) {
            await db.execute('DELETE FROM employee_monthly_attendance_summary WHERE employee_id=(SELECT employee_id FROM employees WHERE id=?) AND year=YEAR(?) AND month=MONTH(?)',[employeeId,month,month]);
            await db.execute('DELETE FROM basic_pay WHERE employee_id=(SELECT employee_id FROM employees WHERE id=?) AND year=YEAR(?) AND month=MONTH(?)',[employeeId,month,month]);
            await db.execute('DELETE FROM employer_epf_etf WHERE employee_id=? AND year=YEAR(?) AND month=MONTH(?)',[employeeId,month,month]);
            await Payroll.delete(employeeId,month);
            return;
        }
        await db.execute(`INSERT INTO employee_monthly_attendance_summary
            (employee_id,year,month,total_working_days,total_working_hours,total_ot_hours,total_sunday_working_hours,total_late_hours,total_no_pay_days,total_leaves)
            SELECT e.employee_id,YEAR(a.date),MONTH(a.date),MAX(ps.working_days),
            SUM(${duration('a.working_minutes','a.working_hours')})/60,
            SUM(CASE WHEN DAYOFWEEK(a.date)<>1 THEN ${duration('a.overtime_minutes','a.overtime')} ELSE 0 END)/60,
            SUM(CASE WHEN DAYOFWEEK(a.date)=1 THEN ${duration('a.overtime_minutes','a.overtime')} ELSE 0 END)/60,
            SUM(CASE WHEN a.status='Late' THEN GREATEST(TIME_TO_SEC(TIMEDIFF(a.check_in,ps.check_in_time))/3600,0) ELSE 0 END),
            SUM(a.status='Absent'),SUM(a.status='Leave')
            FROM attendance a JOIN employees e ON e.id=a.employee_id
            JOIN payroll_settings ps ON ps.id=(SELECT MIN(id) FROM payroll_settings)
            WHERE a.employee_id=? AND YEAR(a.date)=YEAR(?) AND MONTH(a.date)=MONTH(?)
            GROUP BY e.employee_id,YEAR(a.date),MONTH(a.date)
            ON DUPLICATE KEY UPDATE total_working_days=VALUES(total_working_days),total_working_hours=VALUES(total_working_hours),
            total_ot_hours=VALUES(total_ot_hours),total_sunday_working_hours=VALUES(total_sunday_working_hours),
            total_late_hours=VALUES(total_late_hours),total_no_pay_days=VALUES(total_no_pay_days),total_leaves=VALUES(total_leaves)`,[employeeId,month,month]);
        await this.refreshBasicPay(employeeId,month);
        await Payroll.recalculate(employeeId,month);
    }
    static async refreshBasicPay(employeeId,month) {
        await db.execute(`INSERT INTO basic_pay (employee_id,year,month,no_pay_amount,late_amount,net_basic_pay,epf)
            SELECT s.employee_id,s.year,s.month,ROUND(ss.no_pay_rate*s.total_no_pay_days,2),
                ROUND(ss.late_rate*s.total_late_hours,2),
                GREATEST(0,ss.basic_pay-ROUND(ss.no_pay_rate*s.total_no_pay_days,2)-ROUND(ss.late_rate*s.total_late_hours,2)),
                ROUND(GREATEST(0,ss.basic_pay-ROUND(ss.no_pay_rate*s.total_no_pay_days,2)-ROUND(ss.late_rate*s.total_late_hours,2))*ss.epf/100,2)
            FROM employee_monthly_attendance_summary s JOIN employees e ON e.employee_id=s.employee_id
            JOIN salary_structures ss ON ss.department=e.department AND ss.designation=e.designation AND ss.status='Active'
            WHERE e.id=? AND s.year=YEAR(?) AND s.month=MONTH(?)
            ON DUPLICATE KEY UPDATE no_pay_amount=VALUES(no_pay_amount),late_amount=VALUES(late_amount),net_basic_pay=VALUES(net_basic_pay),epf=VALUES(epf)`,[employeeId,month,month]);
        await db.execute(`INSERT INTO employer_epf_etf (employee_id,year,month,epf_amount,etf_amount)
            SELECT e.id,b.year,b.month,ROUND(b.net_basic_pay*ps.epf_percentage/100,2),ROUND(b.net_basic_pay*ps.etf_percentage/100,2)
            FROM basic_pay b JOIN employees e ON e.employee_id=b.employee_id
            JOIN payroll_settings ps ON ps.id=(SELECT MIN(id) FROM payroll_settings)
            WHERE e.id=? AND b.year=YEAR(?) AND b.month=MONTH(?)
            ON DUPLICATE KEY UPDATE epf_amount=VALUES(epf_amount),etf_amount=VALUES(etf_amount)`,[employeeId,month,month]);
    }
    static async update(id,data) {
        const existing=await this.findById(id); if(!existing)return false;
        await Payroll.assertEditable(existing.employee_db_id,existing.date);
        const fields=['check_in','check_out','working_minutes','overtime_minutes','working_hours','overtime','status'];
        await db.execute(`UPDATE attendance SET ${fields.map(key=>`${key}=?`).join(',')} WHERE id=?`,[...fields.map(key=>data[key]),id]);
        await this.refreshMonthlySummary(existing.employee_db_id,existing.date); return true;
    }
    static async delete(id) {
        const row=await this.findById(id); if(!row)return false;
        await Payroll.assertEditable(row.employee_db_id,row.date);
        await db.execute('DELETE FROM attendance WHERE id=?',[id]);
        await this.refreshMonthlySummary(row.employee_db_id,row.date); return true;
    }
    static async getByEmployee(employeeId,start,end) {
        const [rows]=await db.execute('SELECT * FROM attendance WHERE employee_id=? AND date BETWEEN ? AND ? ORDER BY date DESC',[employeeId,start||'1900-01-01',end||'9999-12-31']);return rows;
    }
    static async getMonthlySummary(employeeId,month,year) {
        const [rows]=await db.execute(`SELECT COUNT(*) AS total_days,SUM(status IN ('Present','Late')) AS present_days,
            SUM(status='Absent') AS absent_days,SUM(status='Late') AS late_days,SUM(status='Leave') AS leave_days,
            SUM(${duration('working_minutes','working_hours')})/60 AS total_hours,
            SUM(${duration('overtime_minutes','overtime')})/60 AS total_overtime
            FROM attendance WHERE employee_id=? AND YEAR(date)=? AND MONTH(date)=?`,[employeeId,year,month]);return rows[0];
    }
    static async getSummaryMonths(employeeId) {const [rows]=await db.execute('SELECT year,month FROM employee_monthly_attendance_summary WHERE employee_id=? ORDER BY year DESC,month DESC',[employeeId]);return rows;}
    static async getStoredMonthlySummary(employeeId,year,month) {const [rows]=await db.execute('SELECT * FROM employee_monthly_attendance_summary WHERE employee_id=? AND year=? AND month=?',[employeeId,year,month]);return rows[0]||null;}
    static async getBasicPay(employeeId,year,month) {const [rows]=await db.execute('SELECT * FROM basic_pay WHERE employee_id=? AND year=? AND month=?',[employeeId,year,month]);return rows[0]||null;}
    static async bulkCreate(records) {
        // Lock employees in a stable order to avoid cross-import deadlocks.
        records.sort((a,b)=>a.employee_id-b.employee_id||a.date.localeCompare(b.date));
        const months=new Map();
        for(const row of records){
            await Payroll.assertEditable(row.employee_id,row.date);
            await db.execute(`INSERT INTO attendance (employee_id,date,check_in,check_out,working_minutes,overtime_minutes,working_hours,overtime,status)
                VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE check_in=VALUES(check_in),check_out=VALUES(check_out),
                working_minutes=VALUES(working_minutes),overtime_minutes=VALUES(overtime_minutes),working_hours=VALUES(working_hours),overtime=VALUES(overtime),status=VALUES(status)`,
                [row.employee_id,row.date,row.check_in,row.check_out,row.working_minutes,row.overtime_minutes,row.working_hours,row.overtime,row.status]);
            months.set(`${row.employee_id}|${row.date.slice(0,7)}`,row);
        }
        for(const row of months.values())await this.refreshMonthlySummary(row.employee_id,row.date);
        return records.length;
    }
}
module.exports=Attendance;

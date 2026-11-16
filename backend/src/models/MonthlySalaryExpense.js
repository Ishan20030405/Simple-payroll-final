const db = require('../config/db');
class MonthlySalaryExpense {
    static async getRecent(limit=12) {
        const safeLimit=Math.max(1,Math.min(Math.floor(Number(limit)||12),36));
        const [rows]=await db.execute(`SELECT id,year,month,total_monthly_expenses FROM monthly_salary_expenses ORDER BY year DESC,month DESC LIMIT ${safeLimit}`);return rows.reverse();
    }
    static async recalculate(monthYear) {
        await db.execute(`INSERT INTO monthly_salary_expenses (year,month,total_monthly_expenses)
            SELECT YEAR(?),MONTH(?),COALESCE(SUM(s.net_salary+s.employer_epf+s.employer_etf),0)
            FROM payslips s JOIN payrolls p ON p.employee_id=s.employee_id AND p.month_year=s.month_year
            WHERE s.month_year=? AND p.status IN ('Complete','Paid')
            AND JSON_UNQUOTE(JSON_EXTRACT(p.payroll_data,'$.revision')) <=> JSON_UNQUOTE(JSON_EXTRACT(s.payroll_data,'$.revision'))
            ON DUPLICATE KEY UPDATE total_monthly_expenses=VALUES(total_monthly_expenses)`,[monthYear,monthYear,monthYear]);
    }
}
module.exports=MonthlySalaryExpense;

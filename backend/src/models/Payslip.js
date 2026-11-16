const db = require('../config/db');
const Payroll = require('./Payroll');
const Expense = require('./MonthlySalaryExpense');
const math = require('../utils/payrollMath');
const parse = value => typeof value === 'string' ? JSON.parse(value || '{}') : (value || {});
const fields=['basic_salary','attendance_allowance','special_allowance','travelling_allowance','other_allowance','other_deduction','employer_epf','employer_etf','total_allowances','total_deductions','total_normal_ot_amount','total_sunday_ot_amount','total_additions','gross_salary','net_salary','total_working_days','total_no_pay_days','total_late_hours','no_pay_amount','late_amount','epf'];
class Payslip {
    static async getForUser(userId) {
        const [rows]=await db.execute(`SELECT s.*,DATE_FORMAT(s.month_year,'%Y-%m-%d') AS month_year_text
            FROM payslips s JOIN employees e ON e.id=s.employee_id JOIN payrolls p ON p.employee_id=s.employee_id AND p.month_year=s.month_year
            WHERE e.user_id=? AND p.status IN ('Complete','Paid')
            AND JSON_UNQUOTE(JSON_EXTRACT(p.payroll_data,'$.revision')) <=> JSON_UNQUOTE(JSON_EXTRACT(s.payroll_data,'$.revision')) ORDER BY s.month_year DESC`,[userId]);return rows;
    }
    static async findByEmployeeAndMonth(employeeId,monthYear) {
        const [rows]=await db.execute('SELECT * FROM payslips WHERE employee_id=? AND month_year=?',[employeeId,math.monthDate(monthYear)]);return rows[0]||null;
    }
    static async updateByEmployeeAndMonth(employeeId,monthYear,changes) {
        const month=math.monthDate(monthYear);
        const payroll=await Payroll.assertEditable(employeeId,month);
        if(!payroll)return false;
        const saved=parse(payroll.payroll_data);
        if(!Object.keys(saved).length)throw Object.assign(new Error('Recalculate this legacy payroll before editing.'),{status:409});
        const allowed=['basic_salary','salary_for_epf','no_pay_amount','late_amount','normal_ot_hours','sunday_ot_hours','normal_ot_rate','sunday_ot_rate','epf','other_deduction','allowances'];
        const edits=Object.fromEntries(allowed.filter(key=>changes[key]!==undefined).map(key=>[key,changes[key]]));
        for (const [key, maximum] of [['total_no_pay_days',31],['total_late_hours',744]]) {
            if (changes[key] === undefined) continue;
            const value=math.amount(changes[key],key);
            if(value>maximum || (key==='total_no_pay_days' && !Number.isInteger(value))) throw Object.assign(new Error(`Invalid ${key}`),{status:400});
            edits[key]=value;
        }
        const data=math.salary({...saved,...edits,normal_ot_minutes:changes.normal_ot_hours===undefined?saved.normal_ot_minutes:null,sunday_ot_minutes:changes.sunday_ot_hours===undefined?saved.sunday_ot_minutes:null,allowances:{...saved.allowances,...changes.allowances},apit_tax:0});
        data.revision=require('node:crypto').randomUUID();
        const [settings]=await db.execute('SELECT epf_percentage,etf_percentage FROM payroll_settings ORDER BY id LIMIT 1');
        data.employer_epf=math.money(data.salary_for_epf*Number(settings[0]?.epf_percentage??12)/100);
        data.employer_etf=math.money(data.salary_for_epf*Number(settings[0]?.etf_percentage??3)/100);
        const columns=['total_allowances','total_deductions','total_normal_ot_amount','total_sunday_ot_amount','total_additions','gross_salary','net_salary','apit_tax'];
        await db.execute(`UPDATE payrolls SET ${columns.map(key=>`${key}=?`).join(',')},payroll_data=?,tax_calculated=FALSE WHERE employee_id=? AND month_year=?`,[...columns.map(key=>data[key]),JSON.stringify(data),employeeId,month]);
        return true;
    }
    static async getOptions() {
        const [rows]=await db.execute(`SELECT s.*,DATE_FORMAT(s.month_year,'%Y-%m-%d') AS month_year_text
            FROM payslips s JOIN payrolls p ON p.employee_id=s.employee_id AND p.month_year=s.month_year
            WHERE p.status IN ('Complete','Paid')
            AND JSON_UNQUOTE(JSON_EXTRACT(p.payroll_data,'$.revision')) <=> JSON_UNQUOTE(JSON_EXTRACT(s.payroll_data,'$.revision')) ORDER BY s.month_year DESC,s.employee_name`);return rows;
    }
    static async getGenerationOptions() {
        const [rows]=await db.execute(`SELECT p.*,DATE_FORMAT(p.month_year,'%Y-%m-%d') AS month_year_text,
            e.employee_id AS employee_code,e.full_name AS employee_name,e.department,e.designation
            FROM payrolls p JOIN employees e ON e.id=p.employee_id WHERE p.status='Complete' ORDER BY p.month_year DESC,e.full_name`);
        return rows.map(row=>({...row,...parse(row.payroll_data),employee_id:row.employee_id,month_year:row.month_year,month_year_text:row.month_year_text}));
    }
    static async generate({monthYear,mode='All',employeeId,department,designation}) {
        const month=math.monthDate(monthYear);
        // Serializes with attendance editing and approval using the same employee locks.
        const candidates=await this.getGenerationOptions();const rows=[];
        for(const candidate of candidates.filter(row=>String(row.month_year_text).slice(0,7)===month.slice(0,7)).sort((a,b)=>a.employee_id-b.employee_id)){
            if(mode==='One by one'&&Number(candidate.employee_id)!==Number(employeeId))continue;
            if(mode==='department'&&candidate.department!==department)continue;
            if(mode==='designation'&&candidate.designation!==designation)continue;
            await db.execute('SELECT id FROM employees WHERE id=? FOR UPDATE',[candidate.employee_id]);
            const payroll=await Payroll.findByKey(candidate.employee_id,month);
            if(payroll?.status!=='Complete')continue;
            const snapshot=parse(payroll.payroll_data);
            if(!Object.keys(snapshot).length||!payroll.tax_calculated)throw Object.assign(new Error('Reopen, recalculate and approve legacy payroll before generating a new payslip.'),{status:409});
            const data={...snapshot,apit_tax:Number(payroll.apit_tax),total_deductions:Number(payroll.total_deductions),net_salary:Number(payroll.net_salary)};
            await db.execute(`INSERT INTO payslips (employee_id,month_year,employee_code,employee_name,department,designation,${fields.join(',')},payroll_status,payroll_data)
                VALUES (?,?,?,?,?,?,${fields.map(()=>'?').join(',')},'Complete',?)
                ON DUPLICATE KEY UPDATE employee_code=VALUES(employee_code),employee_name=VALUES(employee_name),department=VALUES(department),designation=VALUES(designation),
                ${fields.map(key=>`${key}=VALUES(${key})`).join(',')},payroll_status='Complete',payroll_data=VALUES(payroll_data)`,
                [payroll.employee_id,month,data.employee_code,data.employee_name,data.department,data.designation,...fields.map(key=>data[key]??0),JSON.stringify(data)]);
            rows.push(data);
        }
        await Expense.recalculate(month);return rows;
    }
}
module.exports=Payslip;

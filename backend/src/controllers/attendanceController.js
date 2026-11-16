const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const PayrollSetting = require('../models/PayrollSetting');
const math = require('../utils/payrollMath');
const resolveEmployee = value => /^\d+$/.test(String(value)) ? Employee.findById(Number(value)) : Employee.findByEmployeeId(value);
const handle = work => async (req,res) => { try { await work(req,res); } catch(error) { res.status(error.status || 500).json({message:error.status ? error.message : 'Unable to save attendance. Verify the employee and salary structure.'}); } };
exports.getAttendanceByDate=handle(async(req,res)=>res.json(await Attendance.getByDate(req.query.date)));
exports.getAttendanceById=handle(async(req,res)=>{const row=await Attendance.findById(req.params.id);res.status(row?200:404).json(row||{message:'Attendance not found'});});
exports.addManualAttendance=handle(async(req,res)=>{
 const employee=await resolveEmployee(req.body.employee_id);
 if(!employee||employee.status!=='Active')return res.status(400).json({message:'Select an active employee'});
 const data=math.attendance(req.body,await PayrollSetting.get());
 if(await Attendance.getByEmployeeAndDate(employee.id,data.date))return res.status(409).json({message:'Attendance already exists for this employee and date'});
 const id=await Attendance.create({...data,employee_id:employee.id});res.status(201).json({message:'Attendance added successfully',data:await Attendance.findById(id)});
});
exports.updateAttendance=handle(async(req,res)=>{
 const row=await Attendance.findById(req.params.id);if(!row)return res.status(404).json({message:'Attendance not found'});
 const data=math.attendance({...row,...req.body,date:row.date},await PayrollSetting.get());
 await Attendance.update(req.params.id,data);res.json({message:'Attendance updated successfully',data:await Attendance.findById(req.params.id)});
});
exports.deleteAttendance=handle(async(req,res)=>{const ok=await Attendance.delete(req.params.id);res.status(ok?200:404).json({message:ok?'Attendance deleted successfully':'Attendance not found'});});
exports.bulkUploadAttendance=handle(async(req,res)=>{
 if(!Array.isArray(req.body.records)||!req.body.records.length||req.body.records.length>2000)return res.status(400).json({message:'Upload between 1 and 2000 attendance records'});
 const settings=await PayrollSetting.get();const records=[];const seen=new Set();
 for(const [index,row] of req.body.records.entries()){
  const employee=await resolveEmployee(row.employee_id);
  if(!employee||employee.status!=='Active')return res.status(400).json({message:'Invalid or inactive employee on row '+(index+1)});
  const data=math.attendance(row,settings);const key=employee.id+'|'+data.date;
  if(seen.has(key))return res.status(400).json({message:'Duplicate employee/date on row '+(index+1)});
  seen.add(key);records.push({...data,employee_id:employee.id});
 }
 const inserted=await Attendance.bulkCreate(records);res.json({message:'Attendance imported successfully',inserted});
});
// Get employee attendance summary
exports.getEmployeeAttendanceSummary = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;

        if (!employeeId || !month || !year) {
            return res.status(400).json({ 
                message: 'Employee ID, month, and year are required' 
            });
        }

        let dbEmployeeId = employeeId;
        if (isNaN(employeeId)) {
            const employee = await Employee.findByEmployeeId(employeeId);
            if (!employee) return res.status(404).json({ message: 'Employee not found' });
            dbEmployeeId = employee.id;
        }

        const summary = await Attendance.getMonthlySummary(dbEmployeeId, parseInt(month), parseInt(year));
        res.status(200).json(summary);
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ 
            message: 'Error fetching attendance summary', 
            error: error.message 
        });
    }
};

// Get available payroll months from employee monthly attendance summaries
exports.getEmployeeSummaryMonths = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const months = await Attendance.getSummaryMonths(employeeId);
        res.status(200).json(months);
    } catch (error) {
        console.error('Error fetching summary months:', error);
        res.status(500).json({ message: 'Error fetching summary months', error: error.message });
    }
};

// Get a stored employee monthly attendance summary
exports.getStoredEmployeeMonthlySummary = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { year, month } = req.query;
        if (!employeeId || !year || !month) {
            return res.status(400).json({ message: 'Employee ID, year, and month are required' });
        }

        const summary = await Attendance.getStoredMonthlySummary(employeeId, parseInt(year), parseInt(month));
        res.status(200).json(summary || {});
    } catch (error) {
        console.error('Error fetching stored monthly summary:', error);
        res.status(500).json({ message: 'Error fetching stored monthly summary', error: error.message });
    }
};

// Get calculated basic pay for an employee and month
exports.getEmployeeBasicPay = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { year, month } = req.query;
        if (!employeeId || !year || !month) {
            return res.status(400).json({ message: 'Employee ID, year, and month are required' });
        }

        const basicPay = await Attendance.getBasicPay(employeeId, parseInt(year), parseInt(month));
        res.status(200).json(basicPay || {});
    } catch (error) {
        console.error('Error fetching basic pay:', error);
        res.status(500).json({ message: 'Error fetching basic pay', error: error.message });
    }
};

// Get employee attendance history
exports.getEmployeeAttendance = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate } = req.query;

        let dbEmployeeId = employeeId;
        if (isNaN(employeeId)) {
            const employee = await Employee.findByEmployeeId(employeeId);
            if (!employee) return res.status(404).json({ message: 'Employee not found' });
            dbEmployeeId = employee.id;
        }

        const records = await Attendance.getByEmployee(dbEmployeeId, startDate, endDate);
        res.status(200).json(records);
    } catch (error) {
        console.error('Error fetching employee attendance:', error);
        res.status(500).json({ 
            message: 'Error fetching employee attendance', 
            error: error.message 
        });
    }
};
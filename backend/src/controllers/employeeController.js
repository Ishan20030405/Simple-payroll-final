// backend/src/controllers/employeeController.js
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const User = require('../models/User');
const hrAccess = require('../middleware/hrAccess');
const visible = (req,value) => req.user?.role==='HR' ? (Array.isArray(value)?value.map(hrAccess.employee):hrAccess.employee(value)) : value;
async function validateHrInput(req,existing) {
    if(req.user?.role!=='HR')return;
    if(existing?.user_id){
        const [accounts]=await require('../config/db').execute('SELECT role FROM users WHERE id=? FOR UPDATE',[existing.user_id]);
        if(!accounts[0])throw Object.assign(new Error('Linked account no longer exists.'),{status:409});
        existing={...existing,user_role:accounts[0].role};
    }
    if(existing?.user_role==='ADMIN')throw Object.assign(new Error('HR cannot modify administrator records.'),{status:403});
    if(req.body.userRole && req.body.userRole!==(existing?.user_role || 'EMPLOYEE'))throw Object.assign(new Error('Only administrators can assign account roles.'),{status:403});
    const allowed=['employeeId','fullName','email','phone','department','designation','joinDate','address','status','dob','nic','gender','maritalStatus','emergencyContact','userRole','initialPassword'];
    if(Object.keys(req.body).some(key=>!allowed.includes(key)))throw Object.assign(new Error('HR can update employee details only.'),{status:403});
    if(existing && Number(existing.user_id)===Number(req.user.id) && req.body.status==='Inactive')throw Object.assign(new Error('You cannot deactivate your own account.'),{status:409});
}

// Get all employees
exports.getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee.getAll();
        res.status(200).json(visible(req,employees));
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(error.status || 500).json({ message: 'Error fetching employees', error: error.message });
    }
};

// Get employee by ID
exports.getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.status(200).json(visible(req,employee));
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(error.status || 500).json({ message: 'Error fetching employee', error: error.message });
    }
};

// Get employee by employee_id
exports.getEmployeeByEmployeeId = async (req, res) => {
    try {
        const employee = await Employee.findByEmployeeId(req.params.employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.status(200).json(visible(req,employee));
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(error.status || 500).json({ message: 'Error fetching employee', error: error.message });
    }
};

// Create employee
exports.createEmployee = async (req, res) => {
    try {
        await validateHrInput(req);
        const {
            employeeId,
            fullName,
            email,
            phone,
            department,
            designation,
            joinDate,
            address,
            status,
            dob,
            nic,
            gender,
            maritalStatus,
            emergencyContact,
            userRole
        } = req.body;

        if (!fullName || !email) {
            return res.status(400).json({ message: 'Full name and email are required' });
        }

        if (!nic) {
            return res.status(400).json({ message: 'NIC number is required' });
        }

        if (department) {
            const deptExists = await Department.exists(department);
            if (!deptExists) {
                return res.status(400).json({ message: `Department "${department}" does not exist` });
            }
        }

        if (designation) {
            const desigExists = (await Designation.findByDepartment(department)).some(item => item.designation_name === designation && item.status === 'Active');
            if (!desigExists) {
                return res.status(400).json({ message: `Designation "${designation}" does not exist` });
            }
        }

        const employeeData = {
            employeeId: employeeId || undefined,
            fullName,
            email,
            phone: phone || null,
            department: department || null,
            designation: designation || null,
            joinDate: joinDate || null,
            address: address || null,
            status: status || 'Active',
            dob: dob || null,
            nic: nic,
            gender: gender || null,
            maritalStatus: maritalStatus || null,
            emergencyContact: emergencyContact || null,
            userRole: userRole || 'EMPLOYEE'
        };

        if (!req.body.initialPassword || req.body.initialPassword.length < 8) return res.status(400).json({ message: 'An initial login password of at least 8 characters is required' });
        const id = await Employee.create(employeeData);
        const userId = await User.create({ username: email.trim(), password: req.body.initialPassword, role: userRole || 'EMPLOYEE', is_active: employeeData.status === 'Active' });
        await Employee.update(id, { user_id: userId });
        const created = await Employee.findById(id);
        res.status(201).json({ message: 'Employee created successfully', data: visible(req,created) });
    } catch (error) {
        console.error('Error creating employee:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Employee with this email or ID already exists' });
        }
        res.status(error.status || 500).json({ message: 'Error creating employee', error: error.message });
    }
};

// Update employee
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            employeeId,
            fullName,
            email,
            phone,
            department,
            designation,
            joinDate,
            address,
            status,
            dob,
            nic,
            gender,
            maritalStatus,
            emergencyContact,
            userRole
        } = req.body;

        const existing = await Employee.findById(id);
        if (!existing) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        await validateHrInput(req,existing);

        if (department) {
            const deptExists = await Department.exists(department);
            if (!deptExists) {
                return res.status(400).json({ message: `Department "${department}" does not exist` });
            }
        }

        if (designation || department !== undefined) {
            const targetDesignation=designation ?? existing.designation;
            const desigExists = !targetDesignation || (await Designation.findByDepartment(department ?? existing.department)).some(item=>item.designation_name===targetDesignation && item.status==='Active');
            if (!desigExists) {
                return res.status(400).json({ message: `Designation "${designation}" does not exist` });
            }
        }

        if (employeeId && employeeId !== existing.employee_id) return res.status(400).json({message:'Employee ID cannot be changed after creation.'});
        if (req.user.role==='ADMIN' && Number(existing.user_id) === Number(req.user.id) && (status === 'Inactive' || (userRole && userRole !== 'ADMIN'))) return res.status(409).json({message:'You cannot deactivate or remove administrator access from your own account.'});
        const employeeData = {
            employee_id: employeeId || existing.employee_id,
            full_name: fullName || existing.full_name,
            email: email || existing.email,
            phone: phone !== undefined ? phone : existing.phone,
            department: department !== undefined ? department : existing.department,
            designation: designation !== undefined ? designation : existing.designation,
            join_date: joinDate !== undefined ? joinDate : existing.join_date,
            address: address !== undefined ? address : existing.address,
            status: status || existing.status,
            dob: dob !== undefined ? dob : existing.dob,
            nic: nic || existing.nic,
            gender: gender !== undefined ? gender : existing.gender,
            marital_status: maritalStatus !== undefined ? maritalStatus : existing.marital_status,
            emergency_contact: emergencyContact !== undefined ? emergencyContact : existing.emergency_contact
        };

        if (existing.user_id && email && email !== existing.email) await User.update(existing.user_id, { username: email.trim() });
        const success = await Employee.update(id, employeeData);
        if (!success) {
            return res.status(404).json({ message: 'Employee not found or no changes made' });
        }

        if (status === 'Inactive' && existing.user_id) {
            await User.deactivate(existing.user_id);
        }

        if (status === 'Active' && existing.user_id) {
            await User.activate(existing.user_id);
        }

            if (req.user.role==='ADMIN' && userRole && existing.user_id && ['ADMIN', 'HR', 'EMPLOYEE'].includes(userRole)) {
                await User.update(existing.user_id, { role: userRole });
            }

        const updated = await Employee.findById(id);
        res.status(200).json({ message: 'Employee updated successfully', data: visible(req,updated) });
    } catch (error) {
        console.error('Update employee error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Employee with this email or ID already exists' });
        }
        res.status(error.status || 500).json({ message: 'Error updating employee', error: error.message });
    }
};

// ✅ FIXED: Delete employee and cascade delete user account
exports.deleteEmployee=async(req,res)=>{
 try{
  const db=require('../config/db');const {id}=req.params;
  const existing=await Employee.findById(id);if(!existing)return res.status(404).json({message:'Employee not found'});
  if(Number(existing.user_id)===Number(req.user.id))return res.status(409).json({message:'You cannot delete your own account.'});
  const [locked]=await db.execute("SELECT employee_id FROM payrolls WHERE employee_id=? AND status IN ('Complete','Paid') LIMIT 1",[id]);
  if(locked.length)return res.status(409).json({message:'This employee has finalized payroll. Mark the employee inactive to preserve history.'});
  await Employee.delete(id);
  if(existing.user_id)await User.delete(existing.user_id);
  res.json({message:'Employee and linked login account deleted successfully'});
 }catch(error){res.status(error.status||500).json({message:'Unable to delete employee and account. No changes were saved.'});}
};

// Search employees
exports.searchEmployees = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ message: 'Search term is required' });
        }
        const employees = await Employee.search(query);
        res.status(200).json(visible(req,employees));
    } catch (error) {
        console.error('Error searching employees:', error);
        res.status(error.status || 500).json({ message: 'Error searching employees', error: error.message });
    }
};

// Get employees by department
exports.getEmployeesByDepartment = async (req, res) => {
    try {
        const { department } = req.params;
        const employees = await Employee.findByDepartment(department);
        res.status(200).json(visible(req,employees));
    } catch (error) {
        console.error('Error fetching employees by department:', error);
        res.status(error.status || 500).json({ message: 'Error fetching employees by department', error: error.message });
    }
};

// Get employee stats
exports.getEmployeeStats = async (req, res) => {
    try {
        const stats = await Employee.getStats();
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching employee stats:', error);
        res.status(error.status || 500).json({ message: 'Error fetching employee stats', error: error.message });
    }
};

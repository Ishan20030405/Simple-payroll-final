// backend/src/routes/payrollRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const payrollController = require('../controllers/payrollController');
router.use(authenticate, authorize('ADMIN'));

// Get all payrolls
router.get('/', payrollController.getAllPayrolls);

// Get distinct payroll months
router.get('/months', payrollController.getPayrollMonths);

// Get payrolls by employee
router.get('/employee/:employeeId', payrollController.getPayrollsByEmployee);

// Get payroll by ID
router.get('/employee/:employeeId/month/:monthYear', payrollController.getPayrollById);

// Create payroll
router.post('/', payrollController.createPayroll);

// Generate payroll for all employees
router.post('/generate', payrollController.generatePayroll);

// Update payroll
router.put('/employee/:employeeId/month/:monthYear', payrollController.updatePayroll);

// Delete payroll
router.delete('/employee/:employeeId/month/:monthYear', payrollController.deletePayroll);

router.post('/employee/:employeeId/month/:monthYear/reopen', payrollController.reopenPayroll);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;
// backend/src/routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

// All routes require authentication
router.use(authenticate, authorize('ADMIN','HR'))

// Get attendance by date
router.get('/', attendanceController.getAttendanceByDate);

// Add manual attendance
router.post('/', attendanceController.addManualAttendance);

// Bulk upload attendance
router.post('/bulk', attendanceController.bulkUploadAttendance);

// Get employee attendance summary
router.get('/summary/:employeeId', attendanceController.getEmployeeAttendanceSummary);
router.get('/summary-months/:employeeId', attendanceController.getEmployeeSummaryMonths);
router.get('/summary-record/:employeeId', attendanceController.getStoredEmployeeMonthlySummary);
router.get('/basic-pay/:employeeId', authorize('ADMIN'), attendanceController.getEmployeeBasicPay);

// Get employee attendance history
router.get('/employee/:employeeId', attendanceController.getEmployeeAttendance);

// Get attendance by ID
router.get('/:id', attendanceController.getAttendanceById);

// Update attendance
router.put('/:id', attendanceController.updateAttendance);

// Delete attendance
router.delete('/:id', attendanceController.deleteAttendance);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;
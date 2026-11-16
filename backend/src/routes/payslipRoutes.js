const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const payslipController = require('../controllers/payslipController');

router.get('/my', authenticate, payslipController.getMyPayslips);
router.get('/employee/:employeeId/month/:monthYear', authenticate, authorize('ADMIN'), payslipController.getByEmployeeAndMonth);
router.put('/employee/:employeeId/month/:monthYear', authenticate, authorize('ADMIN'), payslipController.updateByEmployeeAndMonth);
router.get('/options', authenticate, authorize('ADMIN'), payslipController.getOptions);
router.get('/generation-options', authenticate, authorize('ADMIN'), payslipController.getGenerationOptions);
router.post('/generate', authenticate, authorize('ADMIN'), payslipController.generate);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;
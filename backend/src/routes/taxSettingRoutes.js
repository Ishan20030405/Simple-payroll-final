const express = require('express');
const router = express.Router();
const taxSettingController = require('../controllers/taxSettingController');
const { authenticate, authorize } = require('../middleware/auth');
router.use(authenticate, authorize('ADMIN'));

// Tax brackets CRUD
router.get('/', taxSettingController.getTaxSettings);
router.put('/', authorize('ADMIN'), taxSettingController.updateTaxSettings);

// Progressive APIT calculation → saves to payrolls.apit_tax
router.post('/calculate', authorize('ADMIN'), taxSettingController.calculateAndSaveTax);

// Summary: payroll records with saved apit_tax
router.get('/summary', taxSettingController.getTaxSummary);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;

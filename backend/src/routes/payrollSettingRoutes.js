// backend/src/routes/payrollSettingRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
    getPayrollSettings,
    updatePayrollSettings,
    resetPayrollSettings
} = require('../controllers/payrollSettingController');

// All routes require authentication
router.use(authenticate, authorize('ADMIN','HR'))

// Get settings
router.get('/attendance', async (req,res,next)=>{try{const settings=await require('../models/PayrollSetting').get();res.json({working_days:settings?.working_days??26,working_hours:settings?.working_hours??8,check_in_time:settings?.check_in_time||'09:00',check_out_time:settings?.check_out_time||'17:00'});}catch(error){next(error);}});
router.get('/', authorize('ADMIN'), getPayrollSettings);

// Update settings (Admin only)
router.put('/', authorize('ADMIN'), updatePayrollSettings);

// Reset settings to defaults (Admin only)
router.post('/reset', authorize('ADMIN'), resetPayrollSettings);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;
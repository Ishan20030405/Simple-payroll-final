const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getByEmployeeAndMonth } = require('../controllers/employerEpfEtfController');

router.get('/employee/:employeeId/year/:year/month/:month', authenticate, authorize('ADMIN'), getByEmployeeAndMonth);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;
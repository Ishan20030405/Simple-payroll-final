const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/monthlySalaryExpenseController');

router.get('/', authenticate, authorize('ADMIN'), controller.getRecent);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;
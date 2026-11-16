const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getCompanyInformation, updateCompanyInformation, resetCompanyInformation, uploadCompanyLogo, getCompanyLogo } = require('../controllers/companyInformationController');

router.use(authenticate);
router.get('/', getCompanyInformation);
router.get('/logo', getCompanyLogo);
router.put('/', authorize('ADMIN'), updateCompanyInformation);
router.post('/reset', authorize('ADMIN'), resetCompanyInformation);
router.post('/logo', authorize('ADMIN'), uploadCompanyLogo);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  last.handle = transactional(last.handle);
 }
}
module.exports = router;
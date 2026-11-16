// backend/src/routes/departmentRoutes.js
const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate, authorize('ADMIN','HR'))

// Routes
router.get('/', departmentController.getAllDepartments);
router.get('/search', departmentController.searchDepartments);
router.get('/:id', departmentController.getDepartment);
router.post('/', authorize('ADMIN'), departmentController.createDepartment);
router.put('/:id', authorize('ADMIN'), departmentController.updateDepartment);
router.delete('/:id', authorize('ADMIN'), departmentController.deleteDepartment);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;
// src/routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('ADMIN','HR'), employeeController.getAllEmployees);
router.get('/search', authenticate, authorize('ADMIN','HR'), employeeController.searchEmployees);
router.get('/stats', authenticate, authorize('ADMIN','HR'), employeeController.getEmployeeStats);
router.get('/:id/profile-picture', authenticate, authorize('ADMIN','HR'), require('../controllers/profilePictureController').getEmployeePicture);
router.get('/:id', authenticate, authorize('ADMIN','HR'), employeeController.getEmployeeById);
router.post('/', authenticate, authorize('ADMIN','HR'), employeeController.createEmployee);
router.put('/:id', authenticate, authorize('ADMIN','HR'), employeeController.updateEmployee);
router.delete('/:id', authenticate, authorize('ADMIN'), employeeController.deleteEmployee);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;

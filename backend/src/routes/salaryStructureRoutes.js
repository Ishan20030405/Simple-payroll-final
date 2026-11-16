// backend/src/routes/salaryStructureRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
    getAllSalaryStructures,
    getSalaryStructureById,
    getSalaryStructureByDeptDesig,
    createSalaryStructure,
    updateSalaryStructure,
    deleteSalaryStructure
} = require('../controllers/salaryStructureController');

// All routes require authentication
router.use(authenticate, authorize('ADMIN'))

// Get all salary structures (Admin only)
router.get('/', authorize('ADMIN'), getAllSalaryStructures);

// Get salary structure by department and designation (query params)
router.get('/search', authorize('ADMIN'), getSalaryStructureByDeptDesig);

// Get salary structure by ID
router.get('/:id', authorize('ADMIN'), getSalaryStructureById);

// Create salary structure (Admin only)
router.post('/', authorize('ADMIN'), createSalaryStructure);

// Update salary structure (Admin only)
router.put('/:id', authorize('ADMIN'), updateSalaryStructure);

// Delete salary structure (Admin only)
router.delete('/:id', authorize('ADMIN'), deleteSalaryStructure);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;
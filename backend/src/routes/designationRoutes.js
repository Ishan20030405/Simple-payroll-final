// src/routes/designationRoutes.js
const express = require('express');
const router = express.Router();
const designationController = require('../controllers/designationController');
const { authenticate, authorize } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authenticate, authorize('ADMIN','HR'), require('../middleware/hrAccess').designationResponse)

// Get all designations
router.get('/', designationController.getAllDesignations);

// Search designations (should be defined before /:id to prevent matching as an ID)
router.get('/search', designationController.searchDesignations);

// Get a specific designation by ID
router.get('/:id', designationController.getDesignation);

// Create a new designation
router.post('/', authorize('ADMIN'), designationController.createDesignation);

// Update a designation
router.put('/:id', authorize('ADMIN'), designationController.updateDesignation);

// Delete a designation
router.delete('/:id', authorize('ADMIN'), designationController.deleteDesignation);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;

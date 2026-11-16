// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/register', authenticate, authorize('ADMIN'), authController.register);
router.post('/login', require('../middleware/loginLimits'), authController.login);
router.post('/verify-otp', require('../middleware/loginLimits'), authController.verifyOTP);
const recovery = require('../controllers/passwordRecoveryController');
const profilePicture = require('../controllers/profilePictureController');
const multer = require('multer');
const pictureUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 } }).single('picture');
router.get('/profile-picture', authenticate, profilePicture.get);
router.put('/profile-picture', authenticate, (req, res, next) => {
  pictureUpload(req, res, error => {
    if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Choose an image smaller than 2 MB.' : 'Upload one image using the picture field.' });
    next();
  });
}, profilePicture.upload);
router.delete('/profile-picture', authenticate, profilePicture.remove);
router.post('/forgot-password', require('../middleware/loginLimits'), recovery.forgotPassword);
router.post('/reset-password', require('../middleware/loginLimits'), recovery.resetPassword);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);
router.put('/change-password', authenticate, authController.changePassword);
router.put('/update/:id', authenticate, authorize('ADMIN'), authController.updateUser);

// Register user from employee (Admin only)
router.post('/register-user', authenticate, authorize('ADMIN'), authController.registerUserFromEmployee);

const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;

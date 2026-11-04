const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { loginLimiter, accountLimiter } = require('../middleware/security.middleware');

// Public routes (rate limited to stop brute-forcing and spam)
router.post('/register', accountLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/forgot-password', accountLimiter, forgotPassword);
router.put('/reset-password/:resetToken', accountLimiter, resetPassword);

// Protected routes (require authentication)
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePassword);

module.exports = router;
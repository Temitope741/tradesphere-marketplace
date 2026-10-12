const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  verifyPayment,
  confirmBankTransfer,
  approvePayment
} = require('../controllers/order.controller');
const { protect } = require('../middleware/auth.middleware');
const { isVendor } = require('../middleware/roleCheck.middleware');

// Debug middleware
router.use((req, res, next) => {
  console.log(`📦 Order Route: ${req.method} ${req.path}`);
  next();
});

router.use(protect); // All order routes require authentication

// Customer routes
router.post('/', createOrder);
router.post('/verify-payment', verifyPayment);
router.get('/', getMyOrders);
router.get('/:id', getOrder);
router.put('/:id/confirm-transfer', confirmBankTransfer);

// Vendor routes - IMPORTANT: These must be defined
router.put('/:id/approve-payment', isVendor, approvePayment);
router.put('/:id/status', isVendor, updateOrderStatus);

module.exports = router;
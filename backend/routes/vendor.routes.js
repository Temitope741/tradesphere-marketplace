const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getVendorProducts,
  getVendorOrders
} = require('../controllers/vendor.controller');
const { protect } = require('../middleware/auth.middleware');
const { isVendor } = require('../middleware/roleCheck.middleware');

router.use(protect, isVendor); // All vendor routes require vendor authentication

router.get('/dashboard', getDashboardStats);
router.get('/products', getVendorProducts);
router.get('/orders', getVendorOrders);

module.exports = router;
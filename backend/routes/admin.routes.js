const express = require('express');
const router = express.Router();
const {
  getStats,
  getUsers,
  setUserStatus,
  getOrders
} = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/roleCheck.middleware');

// Every admin route requires a logged-in admin
router.use(protect, isAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id/status', setUserStatus);
router.get('/orders', getOrders);

module.exports = router;
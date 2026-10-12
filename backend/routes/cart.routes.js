// routes/cart.routes.js
const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.delete('/clear', clearCart);  // ✅ Changed route to /cart/clear
router.put('/:productId', updateCartItem);
router.delete('/:productId', removeFromCart);

module.exports = router;
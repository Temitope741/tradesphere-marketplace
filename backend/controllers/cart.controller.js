const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const ApiResponse = require('../utils/ApiResponse');

// Get user cart
exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product');

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    ApiResponse.success(res, cart);
  } catch (error) {
    next(error);
  }
};

// Add item to cart
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return ApiResponse.error(res, 'Product ID is required', 400);
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return ApiResponse.error(res, 'Product not found or unavailable', 404);
    }

    if (!product.isInStock(quantity)) {
      return ApiResponse.error(res, 'Insufficient stock', 400);
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [{ product: productId, quantity }]
      });
    } else {
      const itemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ product: productId, quantity });
      }
    }

    await cart.save();
    cart = await Cart.findById(cart._id).populate('items.product');

    ApiResponse.success(res, cart, 'Item added to cart');
  } catch (error) {
    next(error);
  }
};

// Update cart item quantity
exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;

    if (!quantity || quantity < 1) {
      return ApiResponse.error(res, 'Invalid quantity', 400);
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return ApiResponse.error(res, 'Cart not found', 404);
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return ApiResponse.error(res, 'Item not in cart', 404);
    }

    const product = await Product.findById(productId);
    if (!product.isInStock(quantity)) {
      return ApiResponse.error(res, 'Insufficient stock', 400);
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate('items.product');
    ApiResponse.success(res, updatedCart, 'Cart updated');
  } catch (error) {
    next(error);
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return ApiResponse.error(res, 'Cart not found', 404);
    }

    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    await cart.save();
    const updatedCart = await Cart.findById(cart._id).populate('items.product');

    ApiResponse.success(res, updatedCart, 'Item removed from cart');
  } catch (error) {
    next(error);
  }
};

// At the end of cart.controller.js - verify this function exists
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return ApiResponse.error(res, 'Cart not found', 404);
    }

    cart.items = [];
    await cart.save();

    ApiResponse.success(res, cart, 'Cart cleared');
  } catch (error) {
    next(error);
  }
};
// controllers/wishlist.controller.js
const Wishlist = require('../models/Wishlist.model');
const Product = require('../models/Product.model');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private
exports.getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.find({ user: req.user._id })
      .populate('product')
      .sort({ createdAt: -1 });

    ApiResponse.success(res, wishlist);
  } catch (error) {
    next(error);
  }
};

// @desc    Add to wishlist
// @route   POST /api/wishlist
// @access  Private
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return ApiResponse.error(res, 'Product ID is required', 400);
    }

    const product = await Product.findById(productId);
    if (!product) {
      return ApiResponse.error(res, 'Product not found', 404);
    }

    // Check if already in wishlist
    const existing = await Wishlist.findOne({
      user: req.user._id,
      product: productId
    });

    if (existing) {
      return ApiResponse.error(res, 'Product already in wishlist', 400);
    }

    const wishlistItem = await Wishlist.create({
      user: req.user._id,
      product: productId
    });

    const populatedItem = await Wishlist.findById(wishlistItem._id)
      .populate('product');

    ApiResponse.success(res, populatedItem, 'Added to wishlist', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const result = await Wishlist.findOneAndDelete({
      user: req.user._id,
      product: productId
    });

    if (!result) {
      return ApiResponse.error(res, 'Item not in wishlist', 404);
    }

    ApiResponse.success(res, {}, 'Removed from wishlist');
  } catch (error) {
    next(error);
  }
};
// controllers/review.controller.js
const Review = require('../models/Review.model');
const Product = require('../models/Product.model');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get product reviews
// @route   GET /api/reviews/product/:productId
// @access  Public
exports.getProductReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'fullName avatarUrl')
      .sort({ createdAt: -1 });

    ApiResponse.success(res, reviews);
  } catch (error) {
    next(error);
  }
};

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;

    if (!productId || !rating) {
      return ApiResponse.error(res, 'Product ID and rating are required', 400);
    }

    const product = await Product.findById(productId);
    if (!product) {
      return ApiResponse.error(res, 'Product not found', 404);
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id
    });

    if (existingReview) {
      return ApiResponse.error(res, 'You have already reviewed this product', 400);
    }

    const review = await Review.create({
      product: productId,
      user: req.user._id,
      rating,
      comment
    });

    const populatedReview = await Review.findById(review._id)
      .populate('user', 'fullName avatarUrl');

    ApiResponse.success(res, populatedReview, 'Review created', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    let review = await Review.findById(req.params.id);
    if (!review) {
      return ApiResponse.error(res, 'Review not found', 404);
    }

    // Check if user owns the review
    if (review.user.toString() !== req.user._id.toString()) {
      return ApiResponse.error(res, 'Not authorized', 403);
    }

    review = await Review.findByIdAndUpdate(
      req.params.id,
      { rating, comment },
      { new: true, runValidators: true }
    ).populate('user', 'fullName avatarUrl');

    ApiResponse.success(res, review, 'Review updated');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return ApiResponse.error(res, 'Review not found', 404);
    }

    // Check if user owns the review
    if (review.user.toString() !== req.user._id.toString()) {
      return ApiResponse.error(res, 'Not authorized', 403);
    }

    await review.remove();

    ApiResponse.success(res, {}, 'Review deleted');
  } catch (error) {
    next(error);
  }
};
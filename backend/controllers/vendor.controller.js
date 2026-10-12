// controllers/vendor.controller.js
const Order = require('../models/Order.model');
const Product = require('../models/Product.model');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get vendor dashboard statistics
// @route   GET /api/vendor/dashboard
// @access  Private (Vendor only)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const vendorId = req.user._id;

    // Get total products
    const totalProducts = await Product.countDocuments({ 
      vendor: vendorId 
    });

    // Get active products
    const activeProducts = await Product.countDocuments({ 
      vendor: vendorId, 
      isActive: true 
    });

    // Get total orders
    const totalOrders = await Order.countDocuments({ 
      vendor: vendorId 
    });

    // Get pending orders
    const pendingOrders = await Order.countDocuments({ 
      vendor: vendorId, 
      status: 'pending' 
    });

    // Get processing orders
    const processingOrders = await Order.countDocuments({
      vendor: vendorId,
      status: 'processing'
    });

    // Get delivered orders
    const deliveredOrders = await Order.countDocuments({
      vendor: vendorId,
      status: 'delivered'
    });

    // Get low stock products (in stock but at/below threshold)
    const LOW_STOCK_THRESHOLD = 5;
    const lowStockProducts = await Product.countDocuments({
      vendor: vendorId,
      isActive: true,
      stockQuantity: { $lte: LOW_STOCK_THRESHOLD, $gt: 0 }
    });

    // Calculate total revenue
    const revenueData = await Order.aggregate([
      { $match: { vendor: vendorId, paymentStatus: { $in: ['paid', 'approved'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    // Get recent orders
    const recentOrders = await Order.find({ vendor: vendorId })
      .populate('customer', 'fullName email')
      .populate('items.product', 'name imageUrl')
      .sort({ createdAt: -1 })
      .limit(5);

    const stats = {
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      lowStockProducts,
      totalRevenue,
      recentOrders
    };

    ApiResponse.success(res, stats);
  } catch (error) {
    next(error);
  }
}

// @desc    Get vendor products
// @route   GET /api/vendor/products
// @access  Private (Vendor only)
exports.getVendorProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, category, status } = req.query;

    const query = { vendor: req.user._id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.isActive = status === 'active';
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    ApiResponse.success(res, {
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vendor orders with customer details
// @route   GET /api/vendor/orders
// @access  Private (Vendor only)
exports.getVendorOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus } = req.query;

    const query = { vendor: req.user._id };

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const orders = await Order.find(query)
      .populate('customer', 'fullName email phone')
      .populate('items.product', 'name imageUrl')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    ApiResponse.success(res, {
      data: orders,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    next(error);
  }
};
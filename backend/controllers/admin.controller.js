// controllers/admin.controller.js
const User = require('../models/User.model');
const Order = require('../models/Order.model');
const Product = require('../models/Product.model');
const ApiResponse = require('../utils/ApiResponse');

// Escape user input before using it inside a RegExp (prevents regex injection)
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePaging = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

// @desc    Platform-wide statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getStats = async (req, res, next) => {
  try {
    const [
      usersByRole,
      totalOrders,
      pendingOrders,
      openDisputes,
      resolvedDisputes,
      revenueAgg,
      activeProducts
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ 'dispute.status': 'open' }),
      Order.countDocuments({ 'dispute.status': 'resolved' }),
      Order.aggregate([
        { $match: { paymentStatus: { $in: ['paid', 'approved'] }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Product.countDocuments({ isActive: true })
    ]);

    const roleCounts = { customer: 0, vendor: 0, admin: 0 };
    usersByRole.forEach((r) => {
      roleCounts[r._id] = r.count;
    });

    ApiResponse.success(res, {
      users: roleCounts,
      orders: {
        total: totalOrders,
        pending: pendingOrders
      },
      disputes: {
        open: openDisputes,
        resolved: resolvedDisputes
      },
      revenue: revenueAgg[0]?.total || 0,
      activeProducts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List users (filter by role / search by name or email)
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePaging(req);
    const { role, search } = req.query;

    const filter = {};
    if (['customer', 'vendor', 'admin'].includes(role)) {
      filter.role = role;
    }
    if (search && typeof search === 'string') {
      const pattern = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ fullName: pattern }, { email: pattern }];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    ApiResponse.paginated(res, users, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc    Activate or deactivate a user account
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
exports.setUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return ApiResponse.error(res, 'isActive must be true or false', 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }

    if (user._id.toString() === req.user._id.toString()) {
      return ApiResponse.error(res, 'You cannot change your own account status', 400);
    }

    if (user.role === 'admin') {
      return ApiResponse.error(res, 'Admin accounts cannot be deactivated here', 403);
    }

    user.isActive = isActive;
    await user.save();

    // A suspended vendor's products should not stay purchasable
    if (user.role === 'vendor') {
      await Product.updateMany({ vendor: user._id }, { isActive });
    }

    ApiResponse.success(
      res,
      user,
      isActive ? 'Account reactivated' : 'Account deactivated'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    List all orders across the platform (filter by status / dispute)
// @route   GET /api/admin/orders
// @access  Private (Admin only)
exports.getOrders = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePaging(req);
    const { status, dispute } = req.query;

    const filter = {};
    if (['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      filter.status = status;
    }
    if (dispute === 'open' || dispute === 'resolved') {
      filter['dispute.status'] = dispute;
    } else if (dispute === 'any') {
      filter['dispute.status'] = { $in: ['open', 'resolved'] };
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'fullName email phone')
        .populate('vendor', 'fullName email phone')
        .populate('items.product', 'name imageUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    ApiResponse.paginated(res, orders, page, limit, total);
  } catch (error) {
    next(error);
  }
};
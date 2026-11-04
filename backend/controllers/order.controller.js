// controllers/order.controller.js
const Order = require('../models/Order.model');
const Product = require('../models/Product.model');
const Cart = require('../models/Cart.model');
const ApiResponse = require('../utils/ApiResponse');
const { createCheckoutOrder, getCheckoutTransaction } = require('../utils/nomba');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const { shippingAddress, phone, paymentMethod, paymentReference } = req.body;

    if (!shippingAddress) {
      return ApiResponse.error(res, 'Shipping address is required', 400);
    }

    if (!phone) {
      return ApiResponse.error(res, 'Phone number is required', 400);
    }

    if (typeof shippingAddress !== 'string' || typeof phone !== 'string') {
      return ApiResponse.error(res, 'Invalid shipping address or phone number', 400);
    }

    // Only the payment methods the checkout page actually offers are accepted.
    const allowedMethods = ['cash_on_delivery', 'bank_transfer', 'nomba'];
    if (paymentMethod !== undefined && !allowedMethods.includes(paymentMethod)) {
      return ApiResponse.error(res, 'Unsupported payment method', 400);
    }

    // Get cart
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return ApiResponse.error(res, 'Cart is empty', 400);
    }

    // Group items by vendor
    const vendorGroups = {};
    let totalAmount = 0;

    for (const item of cart.items) {
      const product = item.product;

      if (!product || !product.isActive) {
        return ApiResponse.error(res, `Product ${item.product?._id} not available`, 404);
      }

      if (!product.isInStock(item.quantity)) {
        return ApiResponse.error(res, `Insufficient stock for ${product.name}`, 400);
      }

      const vendorId = product.vendor.toString();
      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = [];
      }

      const itemTotal = product.price * item.quantity;
      vendorGroups[vendorId].push({
        product: product._id,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemTotal
      });

      totalAmount += itemTotal;
    }

    // Every new order starts as 'pending' — the customer's own request is
    // never trusted to say "I already paid". Only Nomba's verified webhook /
    // verify-payment check, or the vendor approving a bank transfer, can
    // change it. (Previously sending paymentMethod "card" plus any made-up
    // reference marked the order as paid.)
    const paymentStatus = 'pending';

    // Create orders for each vendor
    const orders = [];
    for (const [vendorId, vendorItems] of Object.entries(vendorGroups)) {
      const vendorTotal = vendorItems.reduce((sum, item) => sum + item.totalPrice, 0);

      const order = await Order.create({
        customer: req.user._id,
        vendor: vendorId,
        items: vendorItems,
        totalAmount: vendorTotal,
        shippingAddress,
        phone,
        paymentMethod: paymentMethod || 'cash_on_delivery',
        paymentStatus,
        paymentReference: typeof paymentReference === 'string' ? paymentReference : null,
        statusHistory: [{ status: 'pending', changedAt: new Date(), changedByRole: 'system' }]
      });

      // Reduce stock for each product
      for (const item of vendorItems) {
        const product = await Product.findById(item.product);
        await product.reduceStock(item.quantity);
      }

      orders.push(order);
    }

    // ─── Nomba: create one checkout order covering the whole cart total ──────
    // IMPORTANT: this runs BEFORE clearing the cart. If Nomba's API call
    // fails, the customer's cart stays intact so they don't lose their items
    // and can simply retry — only cash_on_delivery/bank_transfer/successful
    // nomba orders should result in an emptied cart.
    let checkoutLink = null;

    if (paymentMethod === 'nomba') {
      const sharedReference = `TS-${req.user._id}-${Date.now()}`;

      await Order.updateMany(
        { _id: { $in: orders.map((o) => o._id) } },
        { paymentReference: sharedReference }
      );

      try {
        const nombaOrder = await createCheckoutOrder({
          orderReference: sharedReference,
          amount: totalAmount,
          customerEmail: req.user.email,
          callbackUrl: `${process.env.FRONTEND_URL}/checkout/callback?ref=${sharedReference}`,
        });

        checkoutLink = nombaOrder.checkoutLink;
      } catch (nombaError) {
        console.error('Nomba checkout creation failed:', nombaError);
        // Cart is NOT cleared here — orders already exist as 'pending' in
        // the DB (harmless, no payment happened), but the customer keeps
        // their cart items so they can retry without re-adding everything.
        return ApiResponse.error(res, 'Could not start payment with Nomba. Please try again.', 502);
      }
    }

    // Clear cart — reached only if payment method isn't 'nomba', or if the
    // Nomba checkout order creation above succeeded.
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [] }
    );

    ApiResponse.success(res, { orders, checkoutLink }, 'Order placed successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify payment status (Nomba)
// @route   POST /api/orders/verify-payment
// @access  Private
exports.verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.body;

    if (!reference || typeof reference !== 'string') {
      return ApiResponse.error(res, 'Payment reference is required', 400);
    }

    // Only ever look at the signed-in customer's OWN orders, so knowing
    // someone else's reference can't reveal or touch their orders.
    const ownOrders = { paymentReference: reference, customer: req.user._id };

    // Ask Nomba directly — this is real server-side verification, not just
    // trusting our own DB (which the webhook updates asynchronously).
    let nombaTransaction;
    try {
      nombaTransaction = await getCheckoutTransaction(reference);
    } catch (nombaError) {
      console.error('Nomba transaction fetch failed:', nombaError);
      // Fall back to whatever our DB currently says (e.g. webhook already
      // landed) rather than failing the request outright.
      const orders = await Order.find(ownOrders);
      const allPaid = orders.length > 0 && orders.every((o) => ['paid', 'approved'].includes(o.paymentStatus));
      return ApiResponse.success(res, { orders, paid: allPaid }, allPaid ? 'Payment verified successfully' : 'Payment still pending');
    }

    const isPaid = nombaTransaction?.success === true;

    if (isPaid) {
      await Order.updateMany(
        { ...ownOrders, paymentStatus: { $nin: ['paid', 'approved'] } },
        { paymentStatus: 'paid' }
      );
    }

    const orders = await Order.find(ownOrders);

    if (!orders.length) {
      return ApiResponse.error(res, 'No orders found for this reference', 404);
    }

    ApiResponse.success(
      res,
      { orders, paid: isPaid },
      isPaid ? 'Payment verified successfully' : 'Payment still pending'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm bank transfer
// @route   PUT /api/orders/:id/confirm-transfer
// @access  Private
exports.confirmBankTransfer = async (req, res, next) => {
  try {
    const { transferReference } = req.body;

    if (typeof transferReference !== 'string' || !transferReference.trim()) {
      return ApiResponse.error(res, 'A transfer reference is required', 400);
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return ApiResponse.error(res, 'Order not found', 404);
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return ApiResponse.error(res, 'Not authorized', 403);
    }

    if (order.paymentMethod !== 'bank_transfer') {
      return ApiResponse.error(res, 'This order is not a bank transfer order', 400);
    }

    // Once the vendor has approved the payment, the reference is locked.
    if (order.paymentStatus === 'approved') {
      return ApiResponse.error(res, 'Payment has already been approved', 400);
    }

    order.paymentReference = transferReference.trim();
    order.paymentStatus = 'pending';
    await order.save();

    ApiResponse.success(res, order, 'Bank transfer details submitted. Awaiting verification.');
  } catch (error) {
    next(error);
  }
};

// @desc    Approve payment (Vendor)
// @route   PUT /api/orders/:id/approve-payment
// @access  Private (Vendor only)
exports.approvePayment = async (req, res, next) => {
  try {
    console.log('Approve payment called for order:', req.params.id);
    console.log('User:', req.user._id);

    const order = await Order.findById(req.params.id);

    if (!order) {
      console.log('Order not found');
      return ApiResponse.error(res, 'Order not found', 404);
    }

    console.log('Order vendor:', order.vendor.toString());
    console.log('Request user:', req.user._id.toString());

    // Check if user is the vendor for this order or admin
    if (order.vendor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      console.log('Not authorized');
      return ApiResponse.error(res, 'Not authorized to approve this payment', 403);
    }

    // Check if payment is already approved
    if (order.paymentStatus === 'approved') {
      return ApiResponse.error(res, 'Payment already approved', 400);
    }

    // Update payment status
    order.paymentStatus = 'approved';
    await order.save();

    console.log('Payment approved successfully');

    // Populate order details for response
    await order.populate('customer', 'fullName email phone');
    await order.populate('items.product', 'name imageUrl');

    ApiResponse.success(res, order, 'Payment approved successfully');
  } catch (error) {
    console.error('Error in approvePayment:', error);
    next(error);
  }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('vendor', 'fullName email phone')
      .populate('items.product', 'name imageUrl')
      .sort({ createdAt: -1 });

    ApiResponse.success(res, orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'fullName email phone')
      .populate('vendor', 'fullName email phone')
      .populate('items.product', 'name imageUrl price');

    if (!order) {
      return ApiResponse.error(res, 'Order not found', 404);
    }

    if (
      order.customer._id.toString() !== req.user._id.toString() &&
      order.vendor._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return ApiResponse.error(res, 'Not authorized', 403);
    }

    ApiResponse.success(res, order);
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Vendor only)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return ApiResponse.error(res, 'Invalid status', 400);
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return ApiResponse.error(res, 'Order not found', 404);
    }

    if (order.vendor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return ApiResponse.error(res, 'Not authorized', 403);
    }

    // Delivered and cancelled are final. Without this, a vendor could quietly
    // flip a delivered order back (or revive a cancelled one) after a dispute.
    if (['delivered', 'cancelled'].includes(order.status) && status !== order.status) {
      return ApiResponse.error(
        res,
        `This order is already ${order.status} and its status can no longer be changed`,
        400
      );
    }

    order.status = status;
    // Only record a new timeline step if the status actually changed (or
    // this is the very first entry — older orders created before this
    // field existed won't have one yet). changedBy/changedByRole record
    // WHO made the change, so the timeline doubles as an audit trail.
    const lastEntry = order.statusHistory[order.statusHistory.length - 1];
    if (!lastEntry || lastEntry.status !== status) {
      order.statusHistory.push({
        status,
        changedAt: new Date(),
        changedBy: req.user._id,
        changedByRole: req.user.role === 'admin' ? 'admin' : 'vendor'
      });
    }
    await order.save();

    ApiResponse.success(res, order, 'Order status updated');
  } catch (error) {
    next(error);
  }
};

// @desc    Raise a dispute on an order (Customer only)
// @route   POST /api/orders/:id/dispute
// @access  Private (order's customer only)
exports.raiseDispute = async (req, res, next) => {
  try {
    const { reason, description } = req.body;

    if (!reason) {
      return ApiResponse.error(res, 'A reason is required to report a problem', 400);
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return ApiResponse.error(res, 'Order not found', 404);
    }

    // Only the customer who placed the order can raise a dispute on it.
    if (order.customer.toString() !== req.user._id.toString()) {
      return ApiResponse.error(res, 'Not authorized', 403);
    }

    if (order.dispute && order.dispute.status === 'open') {
      return ApiResponse.error(res, 'A dispute is already open for this order', 400);
    }

    order.dispute = {
      status: 'open',
      reason,
      description: description || '',
      raisedBy: req.user._id,
      raisedAt: new Date()
    };
    await order.save();

    ApiResponse.success(res, order, 'Problem reported. The vendor has been notified.');
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve a dispute on an order (Vendor or Admin)
// @route   PUT /api/orders/:id/dispute/resolve
// @access  Private (Vendor on their own order, or Admin)
exports.resolveDispute = async (req, res, next) => {
  try {
    const { resolution } = req.body;

    if (!resolution) {
      return ApiResponse.error(res, 'A resolution note is required', 400);
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return ApiResponse.error(res, 'Order not found', 404);
    }

    if (order.vendor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return ApiResponse.error(res, 'Not authorized', 403);
    }

    if (!order.dispute || order.dispute.status !== 'open') {
      return ApiResponse.error(res, 'There is no open dispute on this order', 400);
    }

    order.dispute.status = 'resolved';
    order.dispute.resolution = resolution;
    order.dispute.resolvedBy = req.user._id;
    order.dispute.resolvedAt = new Date();
    await order.save();

    ApiResponse.success(res, order, 'Dispute marked as resolved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder: exports.createOrder,
  verifyPayment: exports.verifyPayment,
  confirmBankTransfer: exports.confirmBankTransfer,
  approvePayment: exports.approvePayment,
  getMyOrders: exports.getMyOrders,
  getOrder: exports.getOrder,
  updateOrderStatus: exports.updateOrderStatus,
  raiseDispute: exports.raiseDispute,
  resolveDispute: exports.resolveDispute
};
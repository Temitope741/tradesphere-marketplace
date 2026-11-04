const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  // Every time `status` changes, we also push an entry here so the
  // customer (and the order-detail page) can show a real timeline with
  // a timestamp for each step, not just "where things are right now".
  // changedBy/changedByRole make this a real audit trail: anyone looking
  // at an order can see not just what happened, but who did it.
  statusHistory: [
    {
      status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        required: true
      },
      changedAt: {
        type: Date,
        default: Date.now
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      changedByRole: {
        type: String,
        enum: ['vendor', 'admin', 'system']
      }
    }
  ],
  // Customer protection: lets a customer flag a problem with this order.
  // Vendors/admins see it and can mark it resolved with a note, so there's
  // a visible record of the complaint and how it was handled.
  dispute: {
    status: {
      type: String,
      enum: ['none', 'open', 'resolved'],
      default: 'none'
    },
    reason: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    raisedAt: Date,
    resolution: {
      type: String,
      trim: true
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  },
  shippingAddress: {
    type: String,
    required: [true, 'Shipping address is required']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'approved', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
   enum: [
  'cash_on_delivery',
  'bank_transfer',
  'card',
  'paystack',
  'stripe',
  'nomba'
],
    default: 'cash_on_delivery'
  },
  paymentReference: {
    type: String,
    trim: true
  },
  trackingNumber: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ vendor: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
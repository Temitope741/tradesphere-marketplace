const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// cartSchema.index({ user: 1 });

// Calculate totals before saving
cartSchema.pre('save', async function(next) {
  if (this.items.length === 0) {
    this.totalItems = 0;
    this.totalPrice = 0;
    return next();
  }

  // Populate products if not already populated
  if (!this.populated('items.product')) {
    await this.populate('items.product');
  }
  
  // Calculate total items
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  
  // Calculate total price
  this.totalPrice = this.items.reduce((total, item) => {
    if (item.product && item.product.price) {
      return total + (item.product.price * item.quantity);
    }
    return total;
  }, 0);
  
  next();
});

// Virtual field to return totalPrice as totalAmount for frontend consistency
cartSchema.virtual('totalAmount').get(function() {
  return this.totalPrice;
});

// Ensure virtuals are included when converting to JSON
cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cart', cartSchema);
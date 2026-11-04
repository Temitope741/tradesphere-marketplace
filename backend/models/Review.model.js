const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Please provide a rating'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Prevent duplicate reviews
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });

// Update product rating after review is saved
reviewSchema.post('save', async function() {
  await this.constructor.updateProductRating(this.product);
});

// Update product rating after review is deleted.
// (Mongoose 8 removed document.remove(); deleteOne() is the replacement, and
// its hook has to be registered as a document-level 'deleteOne' hook.)
reviewSchema.post('deleteOne', { document: true, query: false }, async function() {
  await this.constructor.updateProductRating(this.product);
});

// Update product rating after a review is edited (updateReview uses
// findByIdAndUpdate, which does not trigger the 'save' hook above).
reviewSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    await doc.constructor.updateProductRating(doc.product);
  }
});

// Static method to update product rating
reviewSchema.statics.updateProductRating = async function(productId) {
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId);
  if (product) {
    await product.updateRating();
  }
};

module.exports = mongoose.model('Review', reviewSchema);
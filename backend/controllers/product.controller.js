// controllers/product.controller.js
const Product = require('../models/Product.model');

// @desc    Get all products with filters, search, and pagination
// @route   GET /api/products
// @access  Public
exports.getAllProducts = async (req, res, next) => {
  try {
    console.time('Products Query'); // ✅ TRACK PERFORMANCE
    
    const { page = 1, limit = 12, search, category, minPrice, maxPrice, rating } = req.query;

    let filter = { isActive: true }; // ✅ ONLY SHOW ACTIVE PRODUCTS

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Rating filter
    if (rating) {
    filter.averageRating = { $gte: Number(rating) };

    }

    const skip = (Number(page) - 1) * Number(limit);

    // ✅ OPTIMIZED QUERY - ONLY SELECT NEEDED FIELDS + USE .lean()
    const products = await Product.find(filter)
      .select('name price imageUrl category vendor averageRating totalReviews stockQuantity') // ✅ ONLY NEEDED FIELDS
      .populate('category', 'name slug')
      .populate('vendor', 'fullName')
      .lean() // ✅ FASTER QUERIES - RETURNS PLAIN JS OBJECTS
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .maxTimeMS(5000); // ✅ TIMEOUT AFTER 5 SECONDS

    // ✅ RUN COUNT IN PARALLEL WITH QUERY (IF NEEDED FOR PAGINATION)
    const totalProducts = await Product.countDocuments(filter);

    console.timeEnd('Products Query'); // ✅ LOG QUERY TIME

    res.status(200).json({
      success: true,
      count: products.length,
      total: totalProducts,
      pages: Math.ceil(totalProducts / Number(limit)),
      currentPage: Number(page),
      data: products
    });
  } catch (error) {
    console.error('Products query error:', error);
    next(error);
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res, next) => {
  try {
    console.time('Single Product Query');
    
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('vendor', 'fullName email phone')
      .populate({
        path: 'reviews',
        select: 'rating comment user createdAt',
        populate: { path: 'user', select: 'fullName' },
        options: { limit: 10, sort: { createdAt: -1 } } // ✅ LIMIT REVIEWS
      })
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    console.timeEnd('Single Product Query');

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Single product query error:', error);
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Vendor only)
exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stockQuantity, category, imageUrl, images, sku } = req.body;

    // Validate required fields
    if (!name || !price || !category || stockQuantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, price, category, stockQuantity'
      });
    }

    // Check if product already exists
    const existingProduct = await Product.findOne({ 
      name, 
      vendor: req.user.id 
    }).lean();
    
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this name already exists for this vendor'
      });
    }

        // Keep imageUrl (used by product listings, cart, orders, etc.) in sync
    // with the first/primary image whenever a gallery is provided.
    const normalizedImages = Array.isArray(images) ? images.filter(Boolean) : [];
    const primaryImageUrl = normalizedImages[0] || imageUrl;

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      stockQuantity: Number(stockQuantity),
      category,
      imageUrl: primaryImageUrl,
      images: normalizedImages,
      sku,
      vendor: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Vendor owner only)
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user is the vendor owner
    if (product.vendor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'price', 'stockQuantity', 'imageUrl', 'images', 'isActive'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
       // Keep imageUrl in sync with the first/primary image whenever a
    // gallery is included in this update.
    if (Array.isArray(updates.images)) {
      const normalizedImages = updates.images.filter(Boolean);
      updates.images = normalizedImages;
      if (normalizedImages[0]) {
        updates.imageUrl = normalizedImages[0];
      }
    }
    product = await Product.findByIdAndUpdate(
      req.params.id, 
      updates, 
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Vendor owner or Admin)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check authorization
    if (product.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find({ 
      category: req.params.categoryId, 
      isActive: true 
    })
      .select('name price imageUrl category vendor averageRating stockQuantity')
      .populate('category', 'name slug')
      .populate('vendor', 'fullName')
      .lean()
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments({ 
      category: req.params.categoryId, 
      isActive: true 
    });

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / Number(limit)),
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get top rated products
// @route   GET /api/products/top-rated
// @access  Public
exports.getTopRatedProducts = async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;

    const products = await Product.find({ isActive: true })
      .select('name price imageUrl category vendor averageRating')
      .populate('category', 'name')
      .populate('vendor', 'fullName')
      .lean()
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};
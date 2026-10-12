const cloudinary = require('../config/cloudinary');

// Streams a buffer to Cloudinary using its upload_stream API,
// wrapped in a Promise so it can be awaited like any other async call.
const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'tradesphere/products',
        resource_type: 'image',
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
      },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    stream.end(buffer);
  });
};

// @desc    Upload a single product image to Cloudinary
// @route   POST /api/upload/image
// @access  Private (Vendor/Admin only)
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file was provided',
      });
    }

    const result = await streamUpload(req.file.buffer);

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Upload multiple product images to Cloudinary
// @route   POST /api/upload/images
// @access  Private (Vendor/Admin only)
exports.uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files were provided',
      });
    }

    const results = await Promise.all(
      req.files.map((file) => streamUpload(file.buffer))
    );

    res.status(200).json({
      success: true,
      data: results.map((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
      })),
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Delete an image from Cloudinary
// @route   DELETE /api/upload/image
// @access  Private (Vendor/Admin only)
exports.deleteImage = async (req, res, next) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'publicId is required',
      });
    }

    await cloudinary.uploader.destroy(publicId);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
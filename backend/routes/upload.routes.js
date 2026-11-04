const express = require('express');
const router = express.Router();
const { uploadImage, uploadImages, deleteImage } = require('../controllers/upload.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// All upload routes require an authenticated vendor or admin
router.use(protect, authorize('vendor', 'admin'));

router.post('/image', upload.single('image'), uploadImage);
router.post('/images', upload.array('images', 8), uploadImages);
// Deleting is admin-only: Cloudinary image IDs aren't tied to an owner, so a
// vendor could otherwise delete another vendor's product images.
router.delete('/image', authorize('admin'), deleteImage);

module.exports = router;
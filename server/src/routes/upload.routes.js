/**
 * Damini Marketplace - Upload Routes
 * General file upload endpoint for direct image uploads
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { uploadProductImages, createGenericImageUploader } = require('../middlewares/upload.middleware');
const { sendError } = require('../utils/response.util');
const { uploadRateLimit } = require('../middlewares/rateLimit.middleware');
const uploadController = require('../controllers/upload.controller');

const router = express.Router();

/**
 * POST /upload/image
 * Upload single image, returns URL
 */
router.post('/image', protect, uploadRateLimit, uploadProductImages, uploadController.uploadImage);

/**
 * POST /upload/images
 * Upload multiple images, returns array of URLs
 */
router.post('/images', protect, uploadRateLimit, uploadProductImages, uploadController.uploadImages);

/**
 * POST /upload/image/:kind
 * Upload a single image into a purpose-built subdirectory (categories, brands, ...)
 */
const UPLOAD_KINDS = {
  category: 'categories',
  brand: 'brands',
  banner: 'banners',
  festival: 'festivals',
  offer: 'offers',
  video: 'videos',
};

const kindUploaders = Object.fromEntries(
  Object.entries(UPLOAD_KINDS).map(([kind, dir]) => [kind, createGenericImageUploader(dir)])
);

// Resolve the uploader middleware and target directory for the requested kind.
const resolveKindUploader = (req, res, next) => {
  const uploader = kindUploaders[req.params.kind];
  if (!uploader) return sendError(res, 'Invalid upload kind', 400);
  req.uploadDir = UPLOAD_KINDS[req.params.kind];
  uploader(req, res, next);
};

router.post('/image/:kind', protect, uploadRateLimit, resolveKindUploader, uploadController.uploadKindImage);

module.exports = router;

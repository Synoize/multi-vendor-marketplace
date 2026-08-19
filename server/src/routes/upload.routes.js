/**
 * Damini Marketplace - Upload Routes
 * General file upload endpoint for direct image uploads
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { uploadProductImages, createGenericImageUploader } = require('../middlewares/upload.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendError } = require('../utils/response.util');
const { uploadRateLimit } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

/**
 * POST /upload/image
 * Upload single image, returns URL
 */
router.post('/image', protect, uploadRateLimit, uploadProductImages, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return sendError(res, 'No file uploaded', 400);
  }
  const file = req.files[0];
  const url = `/uploads/products/${file.filename}`;
  sendSuccess(res, { url }, 'Image uploaded successfully');
}));

/**
 * POST /upload/images
 * Upload multiple images, returns array of URLs
 */
router.post('/images', protect, uploadRateLimit, uploadProductImages, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return sendError(res, 'No files uploaded', 400);
  }
  const urls = req.files.map(f => `/uploads/products/${f.filename}`);
  sendSuccess(res, { urls }, `${urls.length} image(s) uploaded successfully`);
}));

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

router.post('/image/:kind', protect, uploadRateLimit, (req, res, next) => {
  const uploader = kindUploaders[req.params.kind];
  if (!uploader) return sendError(res, 'Invalid upload kind', 400);
  uploader(req, res, next);
}, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return sendError(res, 'No file uploaded', 400);
  }
  const file = req.files[0];
  const url = `/uploads/${UPLOAD_KINDS[req.params.kind]}/${file.filename}`;
  sendSuccess(res, { url }, 'Image uploaded successfully');
}));

module.exports = router;

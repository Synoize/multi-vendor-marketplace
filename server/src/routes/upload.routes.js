/**
 * Damini Marketplace - Upload Routes
 * General file upload endpoint for direct image uploads
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { uploadProductImages } = require('../middlewares/upload.middleware');
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

module.exports = router;

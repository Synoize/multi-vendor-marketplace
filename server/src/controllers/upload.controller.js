/**
 * Damini Marketplace - Upload Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendError } = require('../utils/response.util');

/**
 * POST /upload/image
 * Upload single image, returns URL
 */
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return sendError(res, 'No file uploaded', 400);
  }
  const file = req.files[0];
  const url = `/uploads/products/${file.filename}`;
  sendSuccess(res, { url }, 'Image uploaded successfully');
});

/**
 * POST /upload/images
 * Upload multiple images, returns array of URLs
 */
const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return sendError(res, 'No files uploaded', 400);
  }
  const urls = req.files.map(f => `/uploads/products/${f.filename}`);
  sendSuccess(res, { urls }, `${urls.length} image(s) uploaded successfully`);
});

/**
 * POST /upload/image/:kind
 * Upload a single image into a purpose-built subdirectory (categories, brands, ...)
 */
const uploadKindImage = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return sendError(res, 'No file uploaded', 400);
  }
  const file = req.files[0];
  const url = `/uploads/${req.uploadDir}/${file.filename}`;
  sendSuccess(res, { url }, 'Image uploaded successfully');
});

module.exports = {
  uploadImage,
  uploadImages,
  uploadKindImage,
};

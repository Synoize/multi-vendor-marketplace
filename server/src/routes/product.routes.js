/**
 * Damini Marketplace - Product Controller & Routes
 */

const express = require('express');
const { protect, requireRole, optionalAuth } = require('../middlewares/auth.middleware');
const { attachVendor } = require('../middlewares/vendor.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response.util');
const { uploadProductImages } = require('../middlewares/upload.middleware');
const productService = require('../services/product.service');

const router = express.Router();

// ─── Public routes ────────────────────────────────────────────────────────────

/** GET /products?search=&category=&brand=&min_price=&max_price=&min_rating=&in_stock=&sort=&order=&page=&limit= */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);
  sendPaginated(res, { ...result, message: 'Products fetched' });
}));

/** GET /products/featured */
router.get('/featured', asyncHandler(async (req, res) => {
  const products = await productService.getFeaturedProducts(parseInt(req.query.limit) || 8);
  sendSuccess(res, products);
}));

/** GET /products/trending */
router.get('/trending', asyncHandler(async (req, res) => {
  const products = await productService.getTrendingProducts(parseInt(req.query.limit) || 10);
  sendSuccess(res, products);
}));

/** GET /products/search/suggestions?q= */
router.get('/search/suggestions', asyncHandler(async (req, res) => {
  const suggestions = await productService.getSearchSuggestions(req.query.q);
  sendSuccess(res, suggestions);
}));

/** GET /products/recently-viewed */
router.get('/recently-viewed', protect, asyncHandler(async (req, res) => {
  const products = await productService.getRecentlyViewed(req.user.id);
  sendSuccess(res, products);
}));

/** GET /products/:slugOrId */
router.get('/:slugOrId', optionalAuth, asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.params.slugOrId, req.user?.id);
  sendSuccess(res, product);
}));

/** GET /products/:productId/related */
router.get('/:productId/related', asyncHandler(async (req, res) => {
  const products = await productService.getRelatedProducts(req.params.productId);
  sendSuccess(res, products);
}));

// ─── Vendor routes ────────────────────────────────────────────────────────────

/** POST /products — create product */
router.post('/', protect, requireRole('vendor'), attachVendor, uploadProductImages, asyncHandler(async (req, res) => {
  const data = JSON.parse(req.body.data || '{}');
  const imageFiles = req.files || [];
  // Support image URLs sent as data.images
  const imageUrls = data.images || [];
  const allImages = [...imageFiles, ...imageUrls];
  const productId = await productService.createProduct(req.vendor.id, data, allImages);
  sendCreated(res, { productId }, 'Product submitted for approval');
}));

/** PUT /products/:id — update product */
router.put('/:id', protect, requireRole('vendor'), attachVendor, asyncHandler(async (req, res) => {
  await productService.updateProduct(req.params.id, req.vendor.id, req.body);
  sendSuccess(res, null, 'Product updated successfully');
}));

/** DELETE /products/:id — delete product */
router.delete('/:id', protect, requireRole('vendor'), attachVendor, asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id, req.vendor.id);
  sendSuccess(res, null, 'Product deleted');
}));

/** POST /products/:id/images */
router.post('/:id/images', protect, requireRole('vendor'), attachVendor, uploadProductImages, asyncHandler(async (req, res) => {
  const urls = (req.files || []).map(f => `/uploads/products/${f.filename}`);
  if (req.body.imageUrls) urls.push(...(Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls]));
  await productService.addProductImages(req.params.id, req.vendor.id, urls);
  sendSuccess(res, { urls }, 'Images added');
}));

/** DELETE /products/images/:imageId */
router.delete('/images/:imageId', protect, requireRole('vendor'), asyncHandler(async (req, res) => {
  const { query } = require('../database/connection');
  await query('DELETE FROM product_images WHERE id = ?', [req.params.imageId]);
  sendSuccess(res, null, 'Image removed');
}));

/** POST /products/:id/variants */
router.post('/:id/variants', protect, requireRole('vendor'), attachVendor, asyncHandler(async (req, res) => {
  await productService.createVariant(req.params.id, req.vendor.id, req.body);
  sendCreated(res, null, 'Variant created');
}));

/** PUT /products/variants/:variantId */
router.put('/variants/:variantId', protect, requireRole('vendor'), asyncHandler(async (req, res) => {
  const { query } = require('../database/connection');
  const { name, price, mrp, stock, attributes, image } = req.body;
  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (price !== undefined) { updates.push('price = ?'); params.push(price); }
  if (mrp !== undefined) { updates.push('mrp = ?'); params.push(mrp); }
  if (stock !== undefined) { updates.push('stock = ?'); params.push(stock); }
  if (attributes !== undefined) { updates.push('attributes = ?'); params.push(JSON.stringify(attributes)); }
  if (image !== undefined) { updates.push('image = ?'); params.push(image); }
  if (updates.length) {
    params.push(req.params.variantId);
    await query(`UPDATE product_variants SET ${updates.join(', ')} WHERE id = ?`, params);
  }
  sendSuccess(res, null, 'Variant updated');
}));

/** DELETE /products/variants/:variantId */
router.delete('/variants/:variantId', protect, requireRole('vendor'), asyncHandler(async (req, res) => {
  const { query } = require('../database/connection');
  await query('UPDATE product_variants SET is_active = 0 WHERE id = ?', [req.params.variantId]);
  sendSuccess(res, null, 'Variant deactivated');
}));

// ─── Admin routes ─────────────────────────────────────────────────────────────

/** PATCH /products/:id/approve */
router.patch('/:id/approve', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await productService.approveProduct(req.params.id);
  sendSuccess(res, null, 'Product approved');
}));

/** PATCH /products/:id/reject */
router.patch('/:id/reject', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  const { reason } = req.body;
  await productService.rejectProduct(req.params.id, reason);
  sendSuccess(res, null, 'Product rejected');
}));

/** PATCH /products/:id/block */
router.patch('/:id/block', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await productService.blockProduct(req.params.id);
  sendSuccess(res, null, 'Product blocked');
}));

module.exports = router;

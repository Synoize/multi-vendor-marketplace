/**
 * Damini Marketplace - Product Controller & Routes
 */

const express = require('express');
const { protect, requireRole, optionalAuth } = require('../middlewares/auth.middleware');
const { attachVendor } = require('../middlewares/vendor.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response.util');
const { query, queryOne } = require('../database/connection');
const { uploadProductImages } = require('../middlewares/upload.middleware');
const productService = require('../services/product.service');

const router = express.Router();

/**
 * Vendor cannot modify a product that the admin has blocked.
 * Handles routes keyed by product id, variant id, or image id.
 */
const ensureProductNotBlocked = async (req, res, next) => {
  try {
    let status;
    if (req.params.variantId) {
      status = (await queryOne(
        'SELECT p.status FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE pv.id = ?',
        [req.params.variantId]
      ))?.status;
    } else if (req.params.imageId) {
      status = (await queryOne(
        'SELECT p.status FROM product_images pi JOIN products p ON pi.product_id = p.id WHERE pi.id = ?',
        [req.params.imageId]
      ))?.status;
    } else {
      status = (await queryOne('SELECT status FROM products WHERE id = ?', [req.params.id]))?.status;
    }
    if (status === 'blocked') {
      return sendError(res, 'This product is blocked by the admin and cannot be modified', 403);
    }
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Public routes ────────────────────────────────────────────────────────────

/** GET /products?search=&category=&brand=&min_price=&max_price=&min_rating=&in_stock=&sort=&order=&page=&limit= */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);
  sendPaginated(res, { ...result, message: 'Products fetched' });
}));

/** GET /products/price-stats */
router.get('/price-stats', asyncHandler(async (req, res) => {
  const stats = await productService.getPriceStats();
  sendSuccess(res, stats);
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
  const products = await productService.getRecentlyViewed(req.user.id, parseInt(req.query.limit) || 10);
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

/**
 * Accept product payload either as a JSON `data` field or as flat multipart fields.
 */
const parseProductBody = (body) => {
  if (typeof body.data === 'string' && body.data.trim()) {
    try { return JSON.parse(body.data); } catch (e) { return {}; }
  }
  const data = { ...body };
  delete data.data;
  delete data.images;
  delete data.existing_images;
  return data;
};

/**
 * Map vendor form field names to DB/service names and coerce values.
 */
const normalizeProductData = (data) => {
  const out = { ...data };
  if (out.category && !out.category_id) out.category_id = out.category;
  delete out.category;
  if (out.cod_available !== undefined && out.is_cod_available === undefined) out.is_cod_available = out.cod_available;
  delete out.cod_available;
  if (!Array.isArray(out.tags)) {
    const raw = data['tags[]'] || data.tags;
    if (Array.isArray(raw)) out.tags = raw;
    else if (typeof raw === 'string') out.tags = raw.split(',').map((t) => t.trim()).filter(Boolean);
  }
  for (const key of ['is_returnable', 'is_cod_available']) {
    if (out[key] === 'true' || out[key] === '1' || out[key] === 1) out[key] = true;
    else if (out[key] === 'false' || out[key] === '0' || out[key] === 0) out[key] = false;
  }
  if (typeof out.dimensions === 'string') {
    try { out.dimensions = JSON.parse(out.dimensions); } catch (e) { delete out.dimensions; }
  }
  return out;
};

/** POST /products — create product */
router.post('/', protect, requireRole('vendor'), attachVendor, uploadProductImages, asyncHandler(async (req, res) => {
  const data = normalizeProductData(parseProductBody(req.body));
  const imageFiles = req.files || [];
  const imageUrls = data.images || [];
  delete data.images;
  const allImages = [...imageFiles, ...imageUrls];
  const productId = await productService.createProduct(req.vendor.id, data, allImages);
  sendCreated(res, { productId }, 'Product submitted for approval');
}));

/** PATCH /products/:id/status — vendor toggles their own product status */
router.patch('/:id/status', protect, requireRole('vendor'), attachVendor, ensureProductNotBlocked, asyncHandler(async (req, res) => {
  await productService.updateProductStatus(req.params.id, req.vendor.id, req.body.status);
  sendSuccess(res, null, 'Product status updated');
}));

/** POST /products/:id/images */
router.post('/:id/images', protect, requireRole('vendor'), attachVendor, ensureProductNotBlocked, uploadProductImages, asyncHandler(async (req, res) => {
  const urls = (req.files || []).map(f => `/uploads/products/${f.filename}`);
  if (req.body.imageUrls) urls.push(...(Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls]));
  await productService.addProductImages(req.params.id, req.vendor.id, urls);
  sendSuccess(res, { urls }, 'Images added');
}));

/** POST /products/:id/variants */
router.post('/:id/variants', protect, requireRole('vendor'), attachVendor, ensureProductNotBlocked, uploadProductImages, asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (typeof data.attributes === 'string') {
    try { data.attributes = JSON.parse(data.attributes); } catch (e) { data.attributes = {}; }
  }
  if (req.files?.length) data.image = `/uploads/products/${req.files[0].filename}`;
  const variant = await productService.createVariant(req.params.id, req.vendor.id, data);
  sendCreated(res, variant, 'Variant created');
}));

/** PUT /products/variants/:variantId */
router.put('/variants/:variantId', protect, requireRole('vendor'), attachVendor, ensureProductNotBlocked, uploadProductImages, asyncHandler(async (req, res) => {
  const body = req.body;
  const name = body.name;
  const price = body.price;
  const mrp = body.mrp;
  const stock = body.stock;
  let attributes = body.attributes;
  let image = body.image;
  if (typeof attributes === 'string') {
    try { attributes = JSON.parse(attributes); } catch (e) { attributes = {}; }
  }
  if (req.files?.length) image = `/uploads/products/${req.files[0].filename}`;
  const owned = await queryOne(
    'SELECT pv.id FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE pv.id = ? AND p.vendor_id = ?',
    [req.params.variantId, req.vendor.id]
  );
  if (!owned) return sendError(res, 'Variant not found', 404);
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
  const updated = await queryOne('SELECT * FROM product_variants WHERE id = ?', [req.params.variantId]);
  if (updated?.attributes) {
    try { updated.attributes = JSON.parse(updated.attributes); } catch (e) { updated.attributes = {}; }
  }
  sendSuccess(res, updated, 'Variant updated');
}));

/** DELETE /products/variants/:variantId */
router.delete('/variants/:variantId', protect, requireRole('vendor'), attachVendor, ensureProductNotBlocked, asyncHandler(async (req, res) => {
  const owned = await queryOne(
    'SELECT pv.id FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE pv.id = ? AND p.vendor_id = ?',
    [req.params.variantId, req.vendor.id]
  );
  if (!owned) return sendError(res, 'Variant not found', 404);
  await query('UPDATE product_variants SET is_active = 0 WHERE id = ?', [req.params.variantId]);
  sendSuccess(res, null, 'Variant deactivated');
}));

/** DELETE /products/images/:imageId */
router.delete('/images/:imageId', protect, requireRole('vendor'), attachVendor, ensureProductNotBlocked, asyncHandler(async (req, res) => {
  const owned = await queryOne(
    'SELECT pi.id FROM product_images pi JOIN products p ON pi.product_id = p.id WHERE pi.id = ? AND p.vendor_id = ?',
    [req.params.imageId, req.vendor.id]
  );
  if (!owned) return sendError(res, 'Image not found', 404);
  await query('DELETE FROM product_images WHERE id = ?', [req.params.imageId]);
  sendSuccess(res, null, 'Image removed');
}));

/** PUT /products/:id — update product (fields + images) */
router.put('/:id', protect, requireRole('vendor'), attachVendor, ensureProductNotBlocked, uploadProductImages, asyncHandler(async (req, res) => {
  const data = normalizeProductData(parseProductBody(req.body));
  if (typeof req.body.existing_images === 'string') {
    try { data.existing_images = JSON.parse(req.body.existing_images); } catch (e) { delete data.existing_images; }
  }
  await productService.updateProduct(req.params.id, req.vendor.id, data, req.files || []);
  sendSuccess(res, null, 'Product updated successfully');
}));

/** DELETE /products/:id — delete product */
router.delete('/:id', protect, requireRole('vendor'), attachVendor, ensureProductNotBlocked, asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id, req.vendor.id);
  sendSuccess(res, null, 'Product deleted');
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

/** PATCH /products/:id/unblock — restore a blocked product to active */
router.patch('/:id/unblock', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await productService.unblockProduct(req.params.id);
  sendSuccess(res, null, 'Product unblocked');
}));

/** PATCH /products/:id/feature — toggle the featured flag (homepage "Featured Products") */
router.patch('/:id/feature', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await productService.setFeaturedProduct(req.params.id, req.body.featured === true || req.body.featured === 1);
  sendSuccess(res, null, 'Featured status updated');
}));

module.exports = router;

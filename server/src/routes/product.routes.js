/**
 * Damini Marketplace - Product Routes
 */

const express = require('express');
const { protect, requireRole, optionalAuth } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const { attachVendor } = require('../middlewares/vendor.middleware');
const { uploadProductImages, uploadProductMedia, uploadExcel } = require('../middlewares/upload.middleware');
const productController = require('../controllers/product.controller');

const router = express.Router();

// ─── Public routes ────────────────────────────────────────────────────────────

/** GET /products?search=&category=&brand=&min_price=&max_price=&min_rating=&in_stock=&sort=&order=&page=&limit= */
router.get('/', optionalAuth, rateLimit('read'), productController.listProducts);

/** GET /products/price-stats */
router.get('/price-stats', rateLimit('read'), productController.getPriceStats);

/** GET /products/featured */
router.get('/featured', rateLimit('read'), productController.getFeaturedProducts);

/** GET /products/trending */
router.get('/trending', rateLimit('read'), productController.getTrendingProducts);

/** GET /products/search/suggestions?q= */
router.get('/search/suggestions', rateLimit('search'), productController.getSearchSuggestions);

/** GET /products/delivery-check?pincode=XXXXXX */
router.get('/delivery-check', rateLimit('read'), productController.checkPincodeDelivery);

/** GET /products/pincode-lookup?pincode=XXXXXX */
router.get('/pincode-lookup', rateLimit('read'), productController.lookupPincode);

/** GET /products/recently-viewed */
router.get('/recently-viewed', protect, rateLimit('read'), productController.getRecentlyViewed);

/** GET /products/by-barcode/:code */
router.get('/by-barcode/:code', rateLimit('read'), productController.getProductByBarcode);

/** GET /products/:slugOrId */
router.get('/:slugOrId', optionalAuth, rateLimit('read'), productController.getProduct);

/** GET /products/:productId/related */
router.get('/:productId/related', rateLimit('read'), productController.getRelatedProducts);

// ─── Vendor routes ────────────────────────────────────────────────────────────

/** POST /products — create product */
router.post('/', protect, requireRole('vendor'), attachVendor, rateLimit('write'), uploadProductMedia, productController.createProduct);

/** PATCH /products/:id/status — vendor toggles their own product status */
router.patch('/:id/status', protect, requireRole('vendor'), attachVendor, rateLimit('write'), productController.ensureProductNotBlocked, productController.updateProductStatus);

/** POST /products/:id/images */
router.post('/:id/images', protect, requireRole('vendor'), attachVendor, rateLimit('upload'), productController.ensureProductNotBlocked, uploadProductImages, productController.addProductImages);

/** POST /products/:id/variants */
router.post('/:id/variants', protect, requireRole('vendor'), attachVendor, rateLimit('upload'), productController.ensureProductNotBlocked, uploadProductImages, productController.createVariant);

/** PUT /products/variants/:variantId */
router.put('/variants/:variantId', protect, requireRole('vendor'), attachVendor, rateLimit('upload'), productController.ensureProductNotBlocked, uploadProductImages, productController.updateVariant);

/** DELETE /products/variants/:variantId */
router.delete('/variants/:variantId', protect, requireRole('vendor'), attachVendor, rateLimit('write'), productController.ensureProductNotBlocked, productController.deleteVariant);

/** GET /products/variants/template — download the bulk variant import Excel template */
router.get('/variants/template', protect, requireRole('vendor'), attachVendor, rateLimit('read'), productController.downloadVariantTemplate);

/** POST /products/:id/variants/preview — upload a spreadsheet and validate rows before importing */
router.post('/:id/variants/preview', protect, requireRole('vendor'), attachVendor, rateLimit('upload'), productController.ensureProductNotBlocked, uploadExcel, productController.previewVariantImport);

/** POST /products/:id/variants/bulk-import — insert validated variant rows en masse */
router.post('/:id/variants/bulk-import', protect, requireRole('vendor'), attachVendor, rateLimit('upload'), productController.ensureProductNotBlocked, productController.bulkImportVariants);

/** DELETE /products/images/:imageId */
router.delete('/images/:imageId', protect, requireRole('vendor'), attachVendor, rateLimit('write'), productController.ensureProductNotBlocked, productController.deleteProductImage);

/** PUT /products/:id — update product (fields + images + video) */
router.put('/:id', protect, requireRole('vendor'), attachVendor, rateLimit('write'), productController.ensureProductNotBlocked, uploadProductMedia, productController.updateProduct);

/** DELETE /products/:id — delete product */
router.delete('/:id', protect, requireRole('vendor'), attachVendor, rateLimit('write'), productController.ensureProductNotBlocked, productController.deleteProduct);

// ─── Admin routes ─────────────────────────────────────────────────────────────

/** PATCH /products/:id/approve */
router.patch('/:id/approve', protect, requireRole('admin'), rateLimit('admin'), productController.approveProduct);

/** PATCH /products/:id/reject */
router.patch('/:id/reject', protect, requireRole('admin'), rateLimit('admin'), productController.rejectProduct);

/** PATCH /products/:id/block */
router.patch('/:id/block', protect, requireRole('admin'), rateLimit('admin'), productController.blockProduct);

/** PATCH /products/:id/unblock — restore a blocked product to active */
router.patch('/:id/unblock', protect, requireRole('admin'), rateLimit('admin'), productController.unblockProduct);

/** PATCH /products/:id/feature — toggle the featured flag (homepage "Featured Products") */
router.patch('/:id/feature', protect, requireRole('admin'), rateLimit('admin'), productController.setFeaturedProduct);

module.exports = router;

/**
 * Damini Marketplace - Product Controller
 */

const path = require('path');
const fs = require('fs/promises');
const config = require('config');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response.util');
const { query, queryOne } = require('../database/connection');
const productService = require('../services/product.service');
const { buildVariantTemplateBuffer, readSpreadsheetRows } = require('../utils/excel.util');

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

// ─── Public ───────────────────────────────────────────────────────────────────

/** GET /products */
const listProducts = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);
  sendPaginated(res, { ...result, message: 'Products fetched' });
});

/** GET /products/price-stats */
const getPriceStats = asyncHandler(async (req, res) => {
  const stats = await productService.getPriceStats();
  sendSuccess(res, stats);
});

/** GET /products/featured */
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await productService.getFeaturedProducts(parseInt(req.query.limit) || 8);
  sendSuccess(res, products);
});

/** GET /products/trending */
const getTrendingProducts = asyncHandler(async (req, res) => {
  const products = await productService.getTrendingProducts(parseInt(req.query.limit) || 10);
  sendSuccess(res, products);
});

/** GET /products/search/suggestions?q= */
const getSearchSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await productService.getSearchSuggestions(req.query.q);
  sendSuccess(res, suggestions);
});

/** GET /products/recently-viewed */
const getRecentlyViewed = asyncHandler(async (req, res) => {
  const products = await productService.getRecentlyViewed(req.user.id, parseInt(req.query.limit) || 10);
  sendSuccess(res, products);
});

/** GET /products/:slugOrId */
const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.params.slugOrId, req.user?.id);
  sendSuccess(res, product);
});

/** GET /products/by-barcode/:code */
const getProductByBarcode = asyncHandler(async (req, res) => {
  const product = await productService.getProductByBarcode(req.params.code);
  if (!product) return sendError(res, 'No product found for this barcode', 404);
  sendSuccess(res, product);
});

/** GET /products/:productId/related */
const getRelatedProducts = asyncHandler(async (req, res) => {
  const products = await productService.getRelatedProducts(req.params.productId);
  sendSuccess(res, products);
});

// ─── Vendor ───────────────────────────────────────────────────────────────────

/** POST /products — create product */
const createProduct = asyncHandler(async (req, res) => {
  const data = normalizeProductData(parseProductBody(req.body));
  if (typeof data.variants === 'string') {
    try { data.variants = JSON.parse(data.variants); } catch (e) { delete data.variants; }
  }
  const imageFiles = Array.isArray(req.files?.images) ? req.files.images : [];
  const videoFile = Array.isArray(req.files?.video) ? req.files.video[0] : null;
  if (videoFile) {
    data.video_url = `/uploads/videos/${videoFile.filename}`;
    data.video_type = 'direct';
  }
  const imageUrls = data.images || [];
  delete data.images;
  const variantImageFiles = Array.isArray(req.files?.variant_images) ? req.files.variant_images : [];
  if (Array.isArray(data.variants)) {
    const refToFile = new Map();
    let imgIdx = 0;
    data.variants = data.variants.map((v) => {
      if (v && (v.image === '__VARIANT_IMAGE__' || v.image?.ref)) {
        let file = null;
        if (v._imageRef) {
          if (refToFile.has(v._imageRef)) {
            file = refToFile.get(v._imageRef);
          } else if (variantImageFiles[imgIdx]) {
            file = variantImageFiles[imgIdx++];
            refToFile.set(v._imageRef, file);
          }
        } else if (variantImageFiles[imgIdx]) {
          file = variantImageFiles[imgIdx++];
        }
        const cleaned = { ...v };
        delete cleaned._imageRef;
        return { ...cleaned, image: file ? `/uploads/products/${file.filename}` : null };
      }
      return v;
    });
  }
  const allImages = [...imageFiles, ...imageUrls];
  const productId = await productService.createProduct(req.vendor.id, data, allImages);
  sendCreated(res, { productId }, 'Product submitted for approval');
});

/** PATCH /products/:id/status — vendor toggles their own product status */
const updateProductStatus = asyncHandler(async (req, res) => {
  await productService.updateProductStatus(req.params.id, req.vendor.id, req.body.status);
  sendSuccess(res, null, 'Product status updated');
});

/** POST /products/:id/images */
const addProductImages = asyncHandler(async (req, res) => {
  const urls = (req.files || []).map(f => `/uploads/products/${f.filename}`);
  if (req.body.imageUrls) urls.push(...(Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls]));
  await productService.addProductImages(req.params.id, req.vendor.id, urls);
  sendSuccess(res, { urls }, 'Images added');
});

/** POST /products/:id/variants */
const createVariant = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (typeof data.attributes === 'string') {
    try { data.attributes = JSON.parse(data.attributes); } catch (e) { data.attributes = {}; }
  }
  if (req.files?.length) data.image = `/uploads/products/${req.files[0].filename}`;
  const variant = await productService.createVariant(req.params.id, req.vendor.id, data);
  sendCreated(res, variant, 'Variant created');
});

/** PUT /products/variants/:variantId */
const updateVariant = asyncHandler(async (req, res) => {
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
});

/** DELETE /products/variants/:variantId */
const deleteVariant = asyncHandler(async (req, res) => {
  const owned = await queryOne(
    'SELECT pv.id, pv.image FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE pv.id = ? AND p.vendor_id = ?',
    [req.params.variantId, req.vendor.id]
  );
  if (!owned) return sendError(res, 'Variant not found', 404);
  await query('DELETE FROM product_variants WHERE id = ?', [req.params.variantId]);
  if (owned.image && !owned.image.startsWith('http')) {
    const file = path.join(process.cwd(), config.get('app.uploadDir'), 'products', path.basename(owned.image));
    await fs.unlink(file).catch(() => { /* best-effort */ });
  }
  sendSuccess(res, null, 'Variant deleted');
});

/** GET /products/variants/template — download bulk import Excel template */
const downloadVariantTemplate = asyncHandler(async (req, res) => {
  const buffer = await buildVariantTemplateBuffer();
  const filename = 'Damini-Variant-Import-Template.xlsx';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
});

/** POST /products/:id/variants/preview — upload spreadsheet, validate, return preview */
const previewVariantImport = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, 'Please upload an Excel file', 400);
  const { rows } = await readSpreadsheetRows(req.file.buffer, req.file.originalname);
  if (!rows.length) return sendError(res, 'The uploaded file contains no data rows', 400);
  const report = await productService.previewVariantImport(req.params.id, req.vendor.id, rows);
  sendSuccess(res, report, 'File preview');
});

/** POST /products/:id/variants/bulk-import — import validated variant rows */
const bulkImportVariants = asyncHandler(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || !rows.length) {
    return sendError(res, 'Provide at least one variant row to import', 400);
  }
  const result = await productService.bulkImportVariants(req.params.id, req.vendor.id, rows);
  sendSuccess(res, result, `Imported ${result.imported} variant(s)`);
});

/** DELETE /products/images/:imageId */
const deleteProductImage = asyncHandler(async (req, res) => {
  const owned = await queryOne(
    'SELECT pi.id FROM product_images pi JOIN products p ON pi.product_id = p.id WHERE pi.id = ? AND p.vendor_id = ?',
    [req.params.imageId, req.vendor.id]
  );
  if (!owned) return sendError(res, 'Image not found', 404);
  await query('DELETE FROM product_images WHERE id = ?', [req.params.imageId]);
  sendSuccess(res, null, 'Image removed');
});

/** PUT /products/:id — update product (fields + images + video) */
const updateProduct = asyncHandler(async (req, res) => {
  const data = normalizeProductData(parseProductBody(req.body));
  if (typeof req.body.existing_images === 'string') {
    try { data.existing_images = JSON.parse(req.body.existing_images); } catch (e) { delete data.existing_images; }
  }
  const imageFiles = Array.isArray(req.files?.images) ? req.files.images : [];
  const videoFile = Array.isArray(req.files?.video) ? req.files.video[0] : null;
  if (videoFile) {
    data.video_url = `/uploads/videos/${videoFile.filename}`;
    data.video_type = 'direct';
  }
  await productService.updateProduct(req.params.id, req.vendor.id, data, imageFiles);
  sendSuccess(res, null, 'Product updated successfully');
});

/** DELETE /products/:id — delete product */
const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id, req.vendor.id);
  sendSuccess(res, null, 'Product deleted');
});

// ─── Admin ────────────────────────────────────────────────────────────────────

/** PATCH /products/:id/approve */
const approveProduct = asyncHandler(async (req, res) => {
  await productService.approveProduct(req.params.id);
  sendSuccess(res, null, 'Product approved');
});

/** PATCH /products/:id/reject */
const rejectProduct = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  await productService.rejectProduct(req.params.id, reason);
  sendSuccess(res, null, 'Product rejected');
});

/** PATCH /products/:id/block */
const blockProduct = asyncHandler(async (req, res) => {
  await productService.blockProduct(req.params.id);
  sendSuccess(res, null, 'Product blocked');
});

/** PATCH /products/:id/unblock */
const unblockProduct = asyncHandler(async (req, res) => {
  await productService.unblockProduct(req.params.id);
  sendSuccess(res, null, 'Product unblocked');
});

/** PATCH /products/:id/feature — toggle the featured flag */
const setFeaturedProduct = asyncHandler(async (req, res) => {
  await productService.setFeaturedProduct(req.params.id, req.body.featured === true || req.body.featured === 1);
  sendSuccess(res, null, 'Featured status updated');
});

/** GET /products/delivery-check?pincode=XXXXXX&pickup_pincode=YYYYYY — check pincode delivery availability & estimate */
const checkPincodeDelivery = asyncHandler(async (req, res) => {
  const pincode = (req.query.pincode || '').trim();
  if (!/^\d{6}$/.test(pincode)) {
    return sendError(res, 'Enter a valid 6-digit pincode', 400);
  }
  const pickupPincode = (req.query.pickup_pincode || '').trim() || null;
  const pincodeService = require('../services/pincode.service');
  const result = await pincodeService.checkDelivery(pincode, pickupPincode);
  sendSuccess(res, result);
});

/** GET /products/pincode-lookup?pincode=XXXXXX — resolve a pincode to city/state for address auto-fill */
const lookupPincode = asyncHandler(async (req, res) => {
  const pincode = (req.query.pincode || '').trim();
  if (!/^\d{6}$/.test(pincode)) {
    return sendError(res, 'Enter a valid 6-digit pincode', 400);
  }
  const pincodeService = require('../services/pincode.service');
  const info = await pincodeService.lookupPincode(pincode);
  if (info.status === 'success') {
    sendSuccess(res, {
      pincode,
      city: info.district || info.name,
      district: info.district,
      state: info.state,
      name: info.name,
    });
  } else {
    sendError(res, 'Pincode not found', 404);
  }
});

module.exports = {
  ensureProductNotBlocked,
  listProducts,
  getPriceStats,
  getFeaturedProducts,
  getTrendingProducts,
  getSearchSuggestions,
  getRecentlyViewed,
  getProduct,
  getProductByBarcode,
  getRelatedProducts,
  createProduct,
  updateProductStatus,
  addProductImages,
  createVariant,
  updateVariant,
  deleteVariant,
  downloadVariantTemplate,
  previewVariantImport,
  bulkImportVariants,
  deleteProductImage,
  updateProduct,
  deleteProduct,
  approveProduct,
  rejectProduct,
  blockProduct,
  unblockProduct,
  setFeaturedProduct,
  checkPincodeDelivery,
  lookupPincode,
};

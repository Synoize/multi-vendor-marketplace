/**
 * Damini Marketplace - Product Service
 * Full product lifecycle management
 */

const { query, queryRows, queryOne, transaction } = require('../database/connection');
const { getPagination, getCursorPagination, encodeCursor } = require('../utils/pagination.util');
const { generateSKU, createSlug } = require('../utils/sku.util');
const { getDescendantCategoryIds } = require('../utils/category.util');
const { v4: uuidv4 } = require('uuid');

/** Safely parse a stored JSON string; returns fallback (default {}) on failure. */
const safeParse = (value, fallback = {}) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (e) { return fallback; }
};

/** Generate unique slug */
const generateUniqueSlug = async (baseSlug) => {
  let slug = baseSlug;
  let counter = 0;
  while (true) {
    const existing = await queryOne('SELECT id FROM products WHERE slug = ?', [slug]);
    if (!existing) break;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
  return slug;
};

const BARCODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const VALID_BARCODE = /^[A-Z0-9-]{3,24}$/;

/** Generate a scannable barcode value (Code 39 friendly: A-Z, 0-9, dash only). */
const generateProductBarcode = () => {
  let code = 'DM';
  for (let i = 0; i < 8; i++) {
    code += BARCODE_ALPHABET[Math.floor(Math.random() * BARCODE_ALPHABET.length)];
  }
  return code;
};

const normalizeBarcode = (value) => String(value ?? '').trim().toUpperCase();

/** Return a barcode that is not already used by another product. */
const uniqueBarcode = async (barcode, excludeId = null) => {
  let code = barcode;
  let params = [];
  const build = (c) => {
    params = [c];
    let sql = 'SELECT id FROM products WHERE barcode = ?';
    if (excludeId) { sql += ' AND id <> ?'; params.push(excludeId); }
    return sql;
  };
  let sql = build(code);
  while (await queryOne(sql, params)) {
    code = generateProductBarcode();
    sql = build(code);
  }
  return code;
};

/** Validate a vendor-supplied barcode string. */
const assertValidBarcode = (barcode) => {
  if (barcode && !VALID_BARCODE.test(barcode)) {
    throw Object.assign(new Error('Barcode must be 3-24 characters using A-Z, 0-9 or -'), { statusCode: 400 });
  }
};

/** Coerce a value to a TINYINT bit (1/0). Missing/falsy-string aware. */
const toBit = (v) => (v === false || v === 0 || v === '0' || v === 'false' ? 0 : 1);

const VIDEO_TYPES = ['youtube', 'vimeo', 'direct'];

/** Normalize product video fields: empty string clears, missing type defaults to direct. */
const normalizeVideo = (url, type) => {
  const cleanUrl = typeof url === 'string' && url.trim() ? url.trim() : null;
  if (!cleanUrl) return { video_url: null, video_type: null };
  return { video_url: cleanUrl, video_type: VIDEO_TYPES.includes(type) ? type : 'direct' };
};

/** Create a new product */
const createProduct = async (vendorId, data, imageFiles = []) => {
  const { name, description, short_description, price, mrp, cost_price, stock, category_id, brand_id,
    weight, dimensions, is_returnable, return_type, return_window, is_cod_available,
    seo_title, seo_description, seo_keywords, tags, low_stock_threshold, variants, video_url, video_type, barcode: rawBarcode } = data;

  const slug = await generateUniqueSlug(createSlug(name));
  const cat = await queryOne('SELECT slug FROM categories WHERE id = ?', [category_id]);
  const sku = generateSKU(cat?.slug || 'GEN', vendorId);
  const barcodeValue = normalizeBarcode(rawBarcode);
  assertValidBarcode(barcodeValue);
  const barcode = await uniqueBarcode(barcodeValue || generateProductBarcode());
  const productId = uuidv4();
  const video = normalizeVideo(video_url, video_type);

  await transaction(async (conn) => {
    const finalReturnType = !is_returnable ? 'no_return' : (return_type || 'full_return');
    const finalReturnWindow = !is_returnable ? 0 : (return_window || 7);
    await conn.execute(
      `INSERT INTO products (id, vendor_id, category_id, brand_id, name, slug, description, short_description,
        price, mrp, cost_price, stock, sku, barcode, weight, dimensions, is_returnable, return_type, return_window,
        is_cod_available, seo_title, seo_description, seo_keywords, tags, low_stock_threshold, video_type, video_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [productId, vendorId, category_id, brand_id || null, name, slug, description || null,
        short_description || null, price, mrp, cost_price || null, stock || 0, sku, barcode,
        weight || null, dimensions ? JSON.stringify(dimensions) : null,
        toBit(is_returnable), finalReturnType, finalReturnWindow,
        toBit(is_cod_available),
        seo_title || null, seo_description || null, seo_keywords || null,
        tags ? JSON.stringify(tags) : null, low_stock_threshold || 5,
        video.video_type, video.video_url]
    );

    for (let i = 0; i < imageFiles.length; i++) {
      const url = typeof imageFiles[i] === 'string' ? imageFiles[i] : `/uploads/products/${imageFiles[i].filename}`;
      await conn.execute(
        'INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
        [productId, url, i === 0 ? 1 : 0, i]
      );
    }

    if (Array.isArray(variants)) {
      for (const v of variants) {
        if (!v || !v.name) continue;
        const variantId = uuidv4();
        await conn.execute(
          'INSERT INTO product_variants (id, product_id, sku, name, attributes, price, mrp, stock, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [variantId, productId, generateSKU('VAR', vendorId), v.name,
            JSON.stringify(v.attributes || {}),
            v.price !== '' && v.price != null ? v.price : null,
            v.mrp !== '' && v.mrp != null ? v.mrp : null,
            v.stock ?? 0, v.image || null]
        );
      }
    }
  });

  return productId;
};

/** Update product */
const updateProduct = async (productId, vendorId, data, imageFiles = []) => {
  const product = await queryOne('SELECT id FROM products WHERE id = ? AND vendor_id = ? AND deleted_at IS NULL', [productId, vendorId]);
  if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });

  const fields = ['name','description','short_description','price','mrp','cost_price','stock',
    'category_id','brand_id','weight','return_type','return_window',
    'seo_title','seo_description','seo_keywords','low_stock_threshold'];

  const updates = [];
  const params = [];
  for (const field of fields) {
    if (data[field] !== undefined) { updates.push(`${field} = ?`); params.push(data[field]); }
  }
  if (data.dimensions !== undefined) { updates.push('dimensions = ?'); params.push(JSON.stringify(data.dimensions)); }
  if (data.tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(data.tags)); }
  if (data.is_returnable !== undefined) { updates.push('is_returnable = ?'); params.push(toBit(data.is_returnable)); }
  if (data.is_returnable !== undefined && !data.is_returnable) {
    updates.push('return_type = ?'); params.push('no_return');
    updates.push('return_window = ?'); params.push(0);
  }
  if (data.is_cod_available !== undefined) { updates.push('is_cod_available = ?'); params.push(toBit(data.is_cod_available)); }
  if (data.barcode !== undefined) {
    const cleaned = normalizeBarcode(data.barcode);
    assertValidBarcode(cleaned);
    const barcode = await uniqueBarcode(cleaned || generateProductBarcode(), productId);
    updates.push('barcode = ?'); params.push(barcode);
  }
  if (data.video_url !== undefined || data.video_type !== undefined) {
    const video = normalizeVideo(data.video_url, data.video_type);
    updates.push('video_url = ?'); params.push(video.video_url);
    updates.push('video_type = ?'); params.push(video.video_type);
  }
  if (updates.length) {
    params.push(productId);
    await query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  // Prune images not kept by the vendor (before inserting new ones, otherwise
  // an empty `existing_images` list would also wipe the newly uploaded files)
  if (data.existing_images !== undefined) {
    const keep = Array.isArray(data.existing_images) ? data.existing_images : [];
    const keepIds = keep.map((img) => (typeof img === 'string' ? img : img.id)).filter(Boolean);
    if (keepIds.length) {
      const placeholders = keepIds.map(() => '?').join(',');
      await query(`DELETE FROM product_images WHERE product_id = ? AND id NOT IN (${placeholders})`, [productId, ...keepIds]);
    } else {
      await query('DELETE FROM product_images WHERE product_id = ?', [productId]);
    }
  }

  // New image files
  if (imageFiles.length) {
    await addProductImages(productId, vendorId, imageFiles.map((f) => `/uploads/products/${f.filename}`));
  }
};

/** Vendor toggles their own product status */
const updateProductStatus = async (productId, vendorId, status) => {
  const allowed = ['active', 'inactive', 'draft', 'out_of_stock'];
  if (!status || !allowed.includes(status)) {
    throw Object.assign(new Error('Invalid status'), { statusCode: 400 });
  }
  const result = await query(
    "UPDATE products SET status = ? WHERE id = ? AND vendor_id = ? AND deleted_at IS NULL",
    [status, productId, vendorId]
  );
  if (result[0].affectedRows === 0) throw Object.assign(new Error('Product not found'), { statusCode: 404 });
};

/** Soft delete */
const deleteProduct = async (productId, vendorId) => {
  const result = await query(
    "UPDATE products SET deleted_at = NOW(), status = 'discontinued' WHERE id = ? AND vendor_id = ?",
    [productId, vendorId]
  );
  if (result[0].affectedRows === 0) throw Object.assign(new Error('Product not found'), { statusCode: 404 });
};

/** Get single product with full details */
const getProduct = async (slugOrId, userId = null) => {
  const product = await queryOne(
    `SELECT p.*, 
      c.name as category_name, c.slug as category_slug,
      b.name as brand_name, b.logo as brand_logo,
      v.store_name, v.store_logo, v.store_description, v.rating as vendor_rating, v.total_reviews as vendor_reviews, v.total_sales as vendor_total_sales,
      v.pickup_pincode as vendor_pickup_pincode, v.pickup_city as vendor_pickup_city, v.pickup_state as vendor_pickup_state,
      u.name as vendor_owner_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     LEFT JOIN vendors v ON p.vendor_id = v.id
     LEFT JOIN users u ON v.user_id = u.id
     WHERE (p.id = ? OR p.slug = ?) AND p.deleted_at IS NULL`,
    [slugOrId, slugOrId]
  );
  if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });

  const images = await queryRows('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', [product.id]);
  const variants = await queryRows('SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1', [product.id]);

  await query('UPDATE products SET view_count = view_count + 1 WHERE id = ?', [product.id]);
  if (userId) {
    await query(
      `INSERT INTO recently_viewed (user_id, product_id, viewed_at) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE viewed_at = NOW()`,
      [userId, product.id]
    );
  }

  return {
    ...product,
    images,
    variants: variants.map(v => ({ ...v, attributes: safeParse(v.attributes) })),
    tags: safeParse(product.tags, []),
    dimensions: safeParse(product.dimensions, null),
  };
};

/** List products with filters (cursor-based pagination) */
const listProducts = async (filters = {}) => {
  const { limit = 20, search, category, brand, vendor_id, min_price, max_price,
    min_rating, in_stock, is_featured, sort = 'created_at', order = 'desc' } = filters;

  const conditions = ["p.status = 'active'", 'p.deleted_at IS NULL'];
  const params = [];

  if (search) { conditions.push('p.name LIKE ?'); params.push(`%${search}%`); }
  if (category) {
    // Include every descendant of the selected category (any depth).
    const ids = await getDescendantCategoryIds({ slug: category });
    if (ids.length) {
      conditions.push(`p.category_id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    } else {
      conditions.push('1 = 0');
    }
  }
  if (brand) { conditions.push('b.slug = ?'); params.push(brand); }
  if (vendor_id) { conditions.push('p.vendor_id = ?'); params.push(vendor_id); }
  if (min_price) { conditions.push('p.price >= ?'); params.push(parseFloat(min_price)); }
  if (max_price) { conditions.push('p.price <= ?'); params.push(parseFloat(max_price)); }
  if (min_rating) { conditions.push('p.rating >= ?'); params.push(parseFloat(min_rating)); }
  if (in_stock === 'true') { conditions.push('p.stock > 0'); }
  if (is_featured === 'true') { conditions.push('p.is_featured = 1'); }

  const SORT_FIELDS = ['price','rating','sale_count','created_at','view_count'];
  const safeSort = SORT_FIELDS.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'asc' ? 'ASC' : 'DESC';
  const cmp = order === 'asc' ? '>' : '<'; // keyset comparison operator
  const where = conditions.join(' AND ');

  const { cursor } = getCursorPagination(filters, parseInt(limit) || 20);
  const effectiveLimit = (parseInt(filters.limit) || limit);

  // Keyset predicate using the same sort column + id tie-breaker
  let keyset = '';
  const keysetParams = [];
  if (cursor) {
    keyset = ` AND (p.${safeSort} ${cmp} ? OR (p.${safeSort} = ? AND p.id ${cmp} ?))`;
    keysetParams.push(cursor.value, cursor.value, cursor.id);
  }

  const products = await queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.rating, p.total_reviews, p.stock, p.is_featured, p.is_cod_available, p.sale_count,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
      b.name as brand_name, v.store_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     LEFT JOIN vendors v ON p.vendor_id = v.id
     WHERE ${where}${keyset} ORDER BY p.${safeSort} ${safeOrder}, p.id ${safeOrder} LIMIT ?`,
    [...params, ...keysetParams, parseInt(effectiveLimit) + 1]
  );

  // Detect whether there is a next page
  const hasMore = products.length > effectiveLimit;
  if (hasMore) products.pop();

  const [{ total }] = await query(
    `SELECT COUNT(*) as total FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     WHERE ${where}`, params
  );

  const last = products[products.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last[safeSort], last.id, safeSort) : null;

  return { products, total: total || 0, page: 1, limit: parseInt(effectiveLimit), nextCursor, hasMore };
};

const getFeaturedProducts = async (limit = 8) =>
  queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.rating, p.total_reviews, p.stock, p.is_cod_available,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
      b.name as brand_name
     FROM products p LEFT JOIN brands b ON p.brand_id = b.id
     WHERE p.status = 'active' AND p.is_featured = 1 AND p.deleted_at IS NULL
     ORDER BY p.sale_count DESC LIMIT ?`, [limit]
  );

const getTrendingProducts = async (limit = 10) =>
  queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.rating, p.stock,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
      b.name as brand_name, (p.sale_count * 3 + p.view_count) as score
     FROM products p LEFT JOIN brands b ON p.brand_id = b.id
     WHERE p.status = 'active' AND p.deleted_at IS NULL
     ORDER BY score DESC LIMIT ?`, [limit]
  );

const getRelatedProducts = async (productId, limit = 8) => {
  const product = await queryOne('SELECT category_id, price FROM products WHERE id = ?', [productId]);
  if (!product) return [];
  return queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.rating, p.stock,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
     FROM products p WHERE p.category_id = ? AND p.id != ? AND p.status = 'active' AND p.deleted_at IS NULL
       AND p.price BETWEEN ? AND ? ORDER BY p.rating DESC LIMIT ?`,
    [product.category_id, productId, product.price * 0.4, product.price * 2.5, limit]
  );
};

const getRecentlyViewed = async (userId, limit = 8) =>
  queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.rating, p.stock, rv.viewed_at,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
     FROM recently_viewed rv JOIN products p ON rv.product_id = p.id
     WHERE rv.user_id = ? AND p.status = 'active' AND p.deleted_at IS NULL
     ORDER BY rv.viewed_at DESC LIMIT ?`, [userId, limit]
  );

const getSearchSuggestions = async (q, limit = 8) => {
  if (!q || q.length < 2) return [];
  return queryRows(
    `SELECT id, name, slug, price,
      (SELECT url FROM product_images WHERE product_id = products.id AND is_primary = 1 LIMIT 1) as primary_image
     FROM products WHERE status = 'active' AND deleted_at IS NULL AND name LIKE ?
     ORDER BY sale_count DESC LIMIT ?`, [`%${q}%`, limit]
  );
};

const approveProduct = async (productId) => query("UPDATE products SET status = 'active' WHERE id = ?", [productId]);
const rejectProduct = async (productId, reason) => query("UPDATE products SET status = 'rejected', rejection_reason = ? WHERE id = ?", [reason, productId]);
const blockProduct = async (productId) => query("UPDATE products SET status = 'blocked' WHERE id = ?", [productId]);
const unblockProduct = async (productId) => query("UPDATE products SET status = 'active' WHERE id = ?", [productId]);
const setFeaturedProduct = async (productId, featured) =>
  query('UPDATE products SET is_featured = ? WHERE id = ?', [featured ? 1 : 0, productId]);

const addProductImages = async (productId, vendorId, imageUrls) => {
  const product = await queryOne('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [productId, vendorId]);
  if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });
  const [[{ c }]] = await query('SELECT COUNT(*) as c FROM product_images WHERE product_id = ?', [productId]);
  const [[{ p }]] = await query('SELECT COUNT(*) as p FROM product_images WHERE product_id = ? AND is_primary = 1', [productId]);
  let sortOrder = c;
  let setPrimary = p === 0;
  for (const url of imageUrls) {
    await query('INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (?, ?, ?, ?)', [productId, url, setPrimary ? 1 : 0, sortOrder++]);
    setPrimary = false;
  }
};

const createVariant = async (productId, vendorId, data) => {
  const product = await queryOne('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [productId, vendorId]);
  if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });
  const { name, price, mrp, stock, attributes, image } = data;
  const sku = generateSKU('VAR', vendorId);
  const variantId = uuidv4();
  await query(
    'INSERT INTO product_variants (id, product_id, sku, name, attributes, price, mrp, stock, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [variantId, productId, sku, name, JSON.stringify(attributes || {}), price, mrp, stock || 0, image || null]
  );
  return {
    id: variantId,
    product_id: productId,
    sku,
    name,
    attributes: attributes || {},
    price,
    mrp,
    stock: stock || 0,
    image: image || null,
    is_active: 1,
  };
};

// ═══ Bulk variant import (Excel) ═════════════════════════════════════════════

const FIXED_VARIANT_FIELDS = new Set(["name", "sku", "price", "mrp", "stock", "image"]);
const MAX_VARIANT_IMPORT_ROWS = 500;

/** Canonical signature for an attribute object (order + whitespace independent). */
const signatureOf = (attrs) =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(attrs || {})
        .sort()
        .map((k) => [k, String(attrs[k]).trim()])
    )
  );

/** Coerce a spreadsheet cell to a finite number (strips ₹, commas, spaces). */
const toNum = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(String(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/**
 * Normalize + validate a single variant row from a spreadsheet.
 * `row.values` maps canonical column keys → cell values (attribute columns are
 * the keys not in FIXED_VARIANT_FIELDS). Returns the normalized variant with
 * an `errors` array (empty = valid).
 */
const buildVariantFromRow = (row, ctx) => {
  const { existingBySig, existingSkus, batchSkus, batchSigs } = ctx;
  const errors = [];
  const attrs = {};

  for (const [key, value] of Object.entries(row.values)) {
    if (FIXED_VARIANT_FIELDS.has(key)) continue;
    const v = String(value).trim();
    if (v) attrs[key] = v;
  }
  if (!Object.keys(attrs).length) {
    errors.push("At least one attribute (e.g. Color, Size) is required.");
  }

  const price = toNum(row.values.price);
  if (price === null || price <= 0) {
    errors.push("Price must be a positive number.");
  } else if (!Number.isInteger(price * 100)) {
    errors.push("Price must have at most 2 decimal places.");
  }

  const mrp = toNum(row.values.mrp);
  if (mrp === null || mrp <= 0) {
    errors.push("MRP must be a positive number.");
  } else if (!Number.isInteger(mrp * 100)) {
    errors.push("MRP must have at most 2 decimal places.");
  } else if (price !== null && price > mrp) {
    errors.push("Price cannot exceed MRP.");
  }

  let stock = 0;
  if (row.values.stock !== undefined && row.values.stock !== "") {
    const stockNum = toNum(row.values.stock);
    if (stockNum === null || !Number.isInteger(stockNum) || stockNum < 0) {
      errors.push("Stock must be a whole number 0 or more.");
    } else {
      stock = stockNum;
    }
  }

  let sku = String(row.values.sku || "").trim().toUpperCase();
  if (sku && !/^[A-Z0-9-]{3,100}$/.test(sku)) {
    errors.push("SKU must be 3-100 characters using A-Z, 0-9 or -.");
  } else if (sku) {
    if (existingSkus.has(sku)) {
      errors.push(`SKU "${sku}" is already used by another variant of this product.`);
    }
    if (batchSkus.has(sku)) {
      errors.push(`SKU "${sku}" appears more than once in this file.`);
    }
    batchSkus.add(sku);
  }

  const signature = signatureOf(attrs);
  if (Object.keys(attrs).length) {
    if (existingBySig.has(signature)) {
      const combo = Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(", ");
      errors.push(`A variant with ${combo} already exists on this product.`);
    }
    if (batchSigs.has(signature)) {
      const combo = Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(", ");
      errors.push(`Duplicate row — ${combo} is repeated in this file.`);
    }
    batchSigs.add(signature);
  }

  let name = String(row.values.name || "").trim();
  if (!name) {
    const entries = Object.entries(attrs);
    if (entries.length) {
      if (entries.length === 1) {
        name = String(entries[0][1]);
      } else {
        name = `${entries[0][1]} / ${entries.slice(1).map(([k, v]) => `${k}: ${v}`).join(" / ")}`;
      }
    }
  }

  return {
    rowNumber: row.rowNumber || 0,
    name,
    sku,
    price,
    mrp,
    stock,
    image: String(row.values.image || "").trim() || null,
    attributes: attrs,
    signature,
    errors,
  };
};

const loadVariantImportContext = async (productId) => {
  const existingVariants = await queryRows(
    "SELECT id, sku, attributes FROM product_variants WHERE product_id = ?",
    [productId]
  );
  const existingBySig = new Set();
  const existingSkus = new Set();
  for (const v of existingVariants) {
    if (v.attributes) existingBySig.add(signatureOf(safeParse(v.attributes)));
    if (v.sku) existingSkus.add(String(v.sku).toUpperCase());
  }
  return { existingBySig, existingSkus, batchSkus: new Set(), batchSigs: new Set() };
};

/**
 * Validate an uploaded variant spreadsheet for a vendor-owned product.
 * Returns the full row-by-row report used by the preview screen.
 */
const previewVariantImport = async (productId, vendorId, parsedRows) => {
  const product = await queryOne(
    "SELECT id FROM products WHERE id = ? AND vendor_id = ? AND deleted_at IS NULL",
    [productId, vendorId]
  );
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  const rows = parsedRows.slice(0, MAX_VARIANT_IMPORT_ROWS);
  const ctx = await loadVariantImportContext(productId);
  const report = rows.map((row) => buildVariantFromRow(row, ctx));

  const attributeKeys = [];
  for (const key of Object.keys(rows[0]?.values || {})) {
    if (!FIXED_VARIANT_FIELDS.has(key) && !attributeKeys.includes(key)) attributeKeys.push(key);
  }

  return {
    rows: report,
    attributeKeys,
    summary: {
      total: report.length,
      valid: report.filter((r) => r.errors.length === 0).length,
      errors: report.filter((r) => r.errors.length > 0).length,
      truncated: parsedRows.length > MAX_VARIANT_IMPORT_ROWS,
    },
  };
};

/**
 * Insert validated variant rows into a vendor-owned product. Rows are
 * re-validated server-side (the client preview output is never trusted) and
 * inserted inside a single transaction. Returns a summary of what was imported.
 */
const bulkImportVariants = async (productId, vendorId, rows = []) => {
  const product = await queryOne(
    "SELECT id FROM products WHERE id = ? AND vendor_id = ? AND deleted_at IS NULL",
    [productId, vendorId]
  );
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  const ctx = await loadVariantImportContext(productId);
  const toInsert = [];
  const skipped = [];

  for (const raw of rows.slice(0, MAX_VARIANT_IMPORT_ROWS)) {
    const values = {
      ...(raw.attributes || {}),
      name: raw.name,
      sku: raw.sku,
      price: raw.price,
      mrp: raw.mrp,
      stock: raw.stock,
      image: raw.image,
    };
    const result = buildVariantFromRow({ rowNumber: raw.rowNumber, values }, ctx);
    if (result.errors.length) {
      skipped.push({ rowNumber: result.rowNumber, name: result.name, errors: result.errors });
      continue;
    }
    toInsert.push(result);
  }

  const created = [];
  if (toInsert.length) {
    await transaction(async (conn) => {
      for (const r of toInsert) {
        const variantId = uuidv4();
        const sku = r.sku || generateSKU("VAR", vendorId);
        await conn.execute(
          `INSERT INTO product_variants (id, product_id, sku, name, attributes, price, mrp, stock, image)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [variantId, productId, sku, r.name, JSON.stringify(r.attributes), r.price, r.mrp, r.stock, r.image]
        );
        created.push({
          id: variantId,
          sku,
          name: r.name,
          attributes: r.attributes,
          price: r.price,
          mrp: r.mrp,
          stock: r.stock,
          image: r.image,
          is_active: 1,
        });
      }
    });
  }

  return { imported: created.length, skipped, variants: created };
};

const getVendorProducts = async (vendorId, filters = {}) => {
  const { page = 1, limit = 20, status, search } = filters;
  const { offset } = getPagination({ page, limit });
  const conditions = ['p.vendor_id = ?', 'p.deleted_at IS NULL'];
  const params = [vendorId];
  if (status) { conditions.push('p.status = ?'); params.push(status); }
  if (search) { conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)'); const q = `%${search}%`; params.push(q, q, q); }
  const where = conditions.join(' AND ');
  const products = await queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.stock, p.status, p.rating, p.total_reviews, p.sale_count, p.sku, p.barcode,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
     FROM products p WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await query(`SELECT COUNT(*) as total FROM products p WHERE ${where}`, params);
  return { products, total, page, limit };
};

/** Vendor lookup of one of their own products by its barcode. Returns null when not found. */
const getVendorProductByBarcode = async (vendorId, code) => {
  if (!code) return null;
  const product = await queryOne(
    `SELECT p.id, p.name, p.slug, p.sku, p.barcode, p.price, p.mrp, p.stock, p.status,
      p.description, p.short_description, p.is_returnable, p.return_window, p.return_type, p.weight,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
     FROM products p
     WHERE p.barcode = ? AND p.vendor_id = ? AND p.deleted_at IS NULL`,
    [code, vendorId]
  );
  if (!product) return null;
  const images = await queryRows('SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order', [product.id]);
  return { ...product, images };
};

/** Public lookup of an active product by its barcode. Returns null when not found. */
const getProductByBarcode = async (code) => {
  if (!code) return null;
  return queryOne(
    `SELECT p.id, p.name, p.slug, p.sku, p.barcode, p.price, p.mrp, p.stock, p.status, p.rating,
      p.total_reviews, p.sale_count, p.short_description, p.is_returnable, p.return_window, p.return_type,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
      c.name as category_name, v.store_name, v.id as vendor_id
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN vendors v ON p.vendor_id = v.id
     WHERE p.barcode = ? AND p.deleted_at IS NULL AND p.status = 'active'`,
    [code]
  );
};

const getLowStockProducts = async (vendorId, threshold = 5) =>
  queryRows(
    `SELECT id, name, slug, stock, low_stock_threshold,
      (SELECT url FROM product_images WHERE product_id = products.id AND is_primary = 1 LIMIT 1) as primary_image
     FROM products WHERE vendor_id = ? AND stock <= low_stock_threshold AND deleted_at IS NULL AND status = 'active'
     ORDER BY stock ASC`, [vendorId]
  );

/** Get min/max price stats from active products */
const getPriceStats = async () => {
  const [[row]] = await query(
    `SELECT MIN(price) as min_price, MAX(price) as max_price FROM products WHERE status = 'active' AND deleted_at IS NULL`
  );
  return { min_price: row?.min_price || 0, max_price: row?.max_price || 0 };
};

module.exports = {
  createProduct, updateProduct, updateProductStatus, deleteProduct, getProduct, listProducts,
  getFeaturedProducts, getTrendingProducts, getRelatedProducts, getRecentlyViewed,
  getSearchSuggestions, approveProduct, rejectProduct, blockProduct, unblockProduct, setFeaturedProduct,
  addProductImages, createVariant, getVendorProducts, getLowStockProducts,
  getVendorProductByBarcode, getProductByBarcode, uniqueBarcode,
  previewVariantImport, bulkImportVariants,
  getPriceStats,
};

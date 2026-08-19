/**
 * Damini Marketplace - Product Service
 * Full product lifecycle management
 */

const { query, queryRows, queryOne, transaction } = require('../database/connection');
const { getPagination, getOrderBy } = require('../utils/pagination.util');
const { generateSKU, createSlug } = require('../utils/sku.util');
const { v4: uuidv4 } = require('uuid');

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

/** Coerce a value to a TINYINT bit (1/0). Missing/falsy-string aware. */
const toBit = (v) => (v === false || v === 0 || v === '0' || v === 'false' ? 0 : 1);

/** Create a new product */
const createProduct = async (vendorId, data, imageFiles = []) => {
  const { name, description, short_description, price, mrp, cost_price, stock, category_id, brand_id,
    weight, dimensions, is_returnable, return_type, return_window, is_cod_available,
    seo_title, seo_description, seo_keywords, tags, low_stock_threshold } = data;

  const slug = await generateUniqueSlug(createSlug(name));
  const cat = await queryOne('SELECT slug FROM categories WHERE id = ?', [category_id]);
  const sku = generateSKU(cat?.slug || 'GEN', vendorId);
  const productId = uuidv4();

  await transaction(async (conn) => {
    await conn.execute(
      `INSERT INTO products (id, vendor_id, category_id, brand_id, name, slug, description, short_description,
        price, mrp, cost_price, stock, sku, weight, dimensions, is_returnable, return_type, return_window,
        is_cod_available, seo_title, seo_description, seo_keywords, tags, low_stock_threshold, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [productId, vendorId, category_id, brand_id || null, name, slug, description || null,
        short_description || null, price, mrp, cost_price || null, stock || 0, sku,
        weight || null, dimensions ? JSON.stringify(dimensions) : null,
        toBit(is_returnable), return_type || 'full_return', return_window || 7,
        toBit(is_cod_available),
        seo_title || null, seo_description || null, seo_keywords || null,
        tags ? JSON.stringify(tags) : null, low_stock_threshold || 5]
    );

    for (let i = 0; i < imageFiles.length; i++) {
      const url = typeof imageFiles[i] === 'string' ? imageFiles[i] : `/uploads/products/${imageFiles[i].filename}`;
      await conn.execute(
        'INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
        [productId, url, i === 0 ? 1 : 0, i]
      );
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
  if (data.is_cod_available !== undefined) { updates.push('is_cod_available = ?'); params.push(toBit(data.is_cod_available)); }
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
    variants: variants.map(v => ({ ...v, attributes: v.attributes ? JSON.parse(v.attributes) : {} })),
    tags: product.tags ? JSON.parse(product.tags) : [],
    dimensions: product.dimensions ? JSON.parse(product.dimensions) : null,
  };
};

/** List products with filters */
const listProducts = async (filters = {}) => {
  const { page = 1, limit = 20, search, category, brand, vendor_id, min_price, max_price,
    min_rating, in_stock, is_featured, sort = 'created_at', order = 'desc' } = filters;
  const { offset } = getPagination({ page, limit });

  const conditions = ["p.status = 'active'", 'p.deleted_at IS NULL'];
  const params = [];

  if (search) { conditions.push('p.name LIKE ?'); params.push(`%${search}%`); }
  if (category) { conditions.push('(c.slug = ? OR c.parent_id = (SELECT id FROM categories WHERE slug = ?))'); params.push(category, category); }
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
  const where = conditions.join(' AND ');

  const products = await queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.rating, p.total_reviews, p.stock, p.is_featured, p.is_cod_available, p.sale_count,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
      b.name as brand_name, v.store_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     LEFT JOIN vendors v ON p.vendor_id = v.id
     WHERE ${where} ORDER BY p.${safeSort} ${safeOrder} LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), parseInt(offset)]
  );

  const [[{ total }]] = await query(
    `SELECT COUNT(*) as total FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     WHERE ${where}`, params
  );

  return { products, total, page: parseInt(page), limit: parseInt(limit) };
};

const getFeaturedProducts = async (limit = 8) =>
  queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.rating, p.total_reviews, p.is_cod_available,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
      b.name as brand_name
     FROM products p LEFT JOIN brands b ON p.brand_id = b.id
     WHERE p.status = 'active' AND p.is_featured = 1 AND p.deleted_at IS NULL
     ORDER BY p.sale_count DESC LIMIT ?`, [limit]
  );

const getTrendingProducts = async (limit = 10) =>
  queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.rating,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
      b.name as brand_name, (p.sale_count * 3 + p.view_count) as score
     FROM products p LEFT JOIN brands b ON p.brand_id = b.id
     WHERE p.status = 'active' AND p.deleted_at IS NULL AND p.stock > 0
     ORDER BY score DESC LIMIT ?`, [limit]
  );

const getRelatedProducts = async (productId, limit = 8) => {
  const product = await queryOne('SELECT category_id, price FROM products WHERE id = ?', [productId]);
  if (!product) return [];
  return queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.rating,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
     FROM products p WHERE p.category_id = ? AND p.id != ? AND p.status = 'active' AND p.deleted_at IS NULL
       AND p.price BETWEEN ? AND ? ORDER BY p.rating DESC LIMIT ?`,
    [product.category_id, productId, product.price * 0.4, product.price * 2.5, limit]
  );
};

const getRecentlyViewed = async (userId, limit = 8) =>
  queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.rating, rv.viewed_at,
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

const getVendorProducts = async (vendorId, filters = {}) => {
  const { page = 1, limit = 20, status, search } = filters;
  const { offset } = getPagination({ page, limit });
  const conditions = ['p.vendor_id = ?', 'p.deleted_at IS NULL'];
  const params = [vendorId];
  if (status) { conditions.push('p.status = ?'); params.push(status); }
  if (search) { conditions.push('p.name LIKE ?'); params.push(`%${search}%`); }
  const where = conditions.join(' AND ');
  const products = await queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.stock, p.status, p.rating, p.total_reviews, p.sale_count, p.sku,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
     FROM products p WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await query(`SELECT COUNT(*) as total FROM products p WHERE ${where}`, params);
  return { products, total, page, limit };
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
  getPriceStats,
};

/**
 * Damini Marketplace - Category Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendError } = require('../utils/response.util');
const { queryRows, queryOne, query } = require('../database/connection');
const { createSlug } = require('../utils/sku.util');

// ─── Category ─────────────────────────────────────────────────────────────────

/** Build a nested tree from a flat category list (unlimited depth). */
const buildTree = (rows, parentId = null) =>
  rows
    .filter(c => (c.parent_id ?? null) === parentId)
    .map(cat => ({
      ...cat,
      parent_id: cat.parent_id ?? null,
      children: buildTree(rows, cat.id),
    }));

/** GET /categories — hierarchical tree (?all=1 includes inactive) */
const listCategories = asyncHandler(async (req, res) => {
  const includeInactive = req.query.all === '1';
  const rows = await queryRows(
    includeInactive
      ? 'SELECT * FROM categories ORDER BY sort_order, name'
      : 'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, name'
  );
  sendSuccess(res, buildTree(rows));
});

/** GET /categories/:slug */
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const cat = await queryOne('SELECT * FROM categories WHERE slug = ? AND is_active = 1', [req.params.slug]);
  if (!cat) return sendSuccess(res, null, 'Category not found');
  sendSuccess(res, cat);
});

/** POST /categories — admin */
const createCategory = asyncHandler(async (req, res) => {
  const { name, parent_id, description, image, icon, banner, sort_order, gst_rate } = req.body;
  const slug = createSlug(name);
  const gst = gst_rate !== undefined && gst_rate !== null && gst_rate !== '' ? Number(gst_rate) : 18;
  if (!(gst >= 0 && gst <= 100)) return sendSuccess(res, null, 'GST rate must be between 0 and 100');
  await query(
    'INSERT INTO categories (parent_id, name, slug, description, image, icon, banner, sort_order, gst_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [parent_id || null, name, slug, description || null, image || null, icon || null, banner || null, sort_order || 0, gst]
  );
  sendCreated(res, null, 'Category created');
});

/** POST /categories (vendor) — create a custom child category under an existing parent */
const createVendorCategory = asyncHandler(async (req, res) => {
  const { name, parent_id, image } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return sendError(res, 'Category name is required', 400);
  }
  const cleanName = name.trim().slice(0, 100);

  const parentId = Number(parent_id);
  const parent =
    parentId && !Number.isNaN(parentId)
      ? await queryOne('SELECT * FROM categories WHERE id = ? AND is_active = 1', [parentId])
      : null;
  if (!parent) {
    return sendError(res, 'Please select a category first', 400);
  }

  const gst = parent.gst_rate != null ? Number(parent.gst_rate) : 18;

  let slug = createSlug(cleanName) || `category-${parentId}`;
  const existing = await queryOne('SELECT id FROM categories WHERE slug = ?', [slug]);
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const [result] = await query(
    'INSERT INTO categories (parent_id, name, slug, description, image, sort_order, gst_rate) VALUES (?, ?, ?, NULL, ?, 0, ?)',
    [parentId, cleanName, slug, image || null, gst]
  );
  const created = await queryOne('SELECT * FROM categories WHERE id = ?', [result.insertId]);
  sendCreated(res, created, 'Category created');
});

/** PUT /categories/:id */
const updateCategory = asyncHandler(async (req, res) => {
  const { name, parent_id, description, image, icon, banner, sort_order, is_active, gst_rate } = req.body;
  const gst = gst_rate !== undefined && gst_rate !== null && gst_rate !== '' ? Number(gst_rate) : null;
  if (gst !== null && !(gst >= 0 && gst <= 100)) return sendSuccess(res, null, 'GST rate must be between 0 and 100');
  const fields = [];
  const params = [];
  if (name) { fields.push('name = ?, slug = ?'); params.push(name, createSlug(name)); }
  if (parent_id !== undefined) { fields.push('parent_id = ?'); params.push(parent_id || null); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (image !== undefined) { fields.push('image = ?'); params.push(image); }
  if (icon !== undefined) { fields.push('icon = ?'); params.push(icon); }
  if (banner !== undefined) { fields.push('banner = ?'); params.push(banner); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
  if (gst !== null) { fields.push('gst_rate = ?'); params.push(gst); }
  if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (fields.length) { params.push(req.params.id); await query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, params); }
  sendSuccess(res, null, 'Category updated');
});

/** DELETE /categories/:id */
const deleteCategory = asyncHandler(async (req, res) => {
  await query('UPDATE categories SET is_active = 0 WHERE id = ?', [req.params.id]);
  sendSuccess(res, null, 'Category deactivated');
});

// ─── Brand ────────────────────────────────────────────────────────────────────

/** GET /brands — ?all=1 returns every brand (incl. inactive) for admin panel */
const listBrands = asyncHandler(async (req, res) => {
  const where = req.query.all === '1' ? '1=1' : 'is_active = 1';
  const brands = await queryRows(
    `SELECT b.*, COUNT(p.id) AS product_count
       FROM brands b
       LEFT JOIN products p ON p.brand_id = b.id
      WHERE ${where}
      GROUP BY b.id
      ORDER BY b.name`
  );
  sendSuccess(res, brands);
});

/** GET /brands/:slug */
const getBrandBySlug = asyncHandler(async (req, res) => {
  const brand = await queryOne('SELECT * FROM brands WHERE slug = ? AND is_active = 1', [req.params.slug]);
  sendSuccess(res, brand);
});

/** POST /brands */
const createBrand = asyncHandler(async (req, res) => {
  const { name, logo, description } = req.body;
  const slug = createSlug(name);
  await query('INSERT INTO brands (name, slug, logo, description) VALUES (?, ?, ?, ?)', [name, slug, logo || null, description || null]);
  sendCreated(res, null, 'Brand created');
});

/** PUT /brands/:id */
const updateBrand = asyncHandler(async (req, res) => {
  const { name, logo, description, is_active } = req.body;
  const fields = []; const params = [];
  if (name) { fields.push('name = ?, slug = ?'); params.push(name, createSlug(name)); }
  if (logo !== undefined) { fields.push('logo = ?'); params.push(logo); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (fields.length) { params.push(req.params.id); await query(`UPDATE brands SET ${fields.join(', ')} WHERE id = ?`, params); }
  sendSuccess(res, null, 'Brand updated');
});

/** DELETE /brands/:id */
const deleteBrand = asyncHandler(async (req, res) => {
  await query('UPDATE brands SET is_active = 0 WHERE id = ?', [req.params.id]);
  sendSuccess(res, null, 'Brand deactivated');
});

module.exports = {
  listCategories,
  getCategoryBySlug,
  createCategory,
  createVendorCategory,
  updateCategory,
  deleteCategory,
  listBrands,
  getBrandBySlug,
  createBrand,
  updateBrand,
  deleteBrand,
};

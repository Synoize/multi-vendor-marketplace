/**
 * Damini Marketplace - Category + Brand Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated } = require('../utils/response.util');
const { queryRows, queryOne, query } = require('../database/connection');
const { createSlug } = require('../utils/sku.util');

// ─── Category Router ──────────────────────────────────────────────────────────
const categoryRouter = express.Router();

/** GET /categories — hierarchical tree (?all=1 includes inactive) */
categoryRouter.get('/', asyncHandler(async (req, res) => {
  const includeInactive = req.query.all === '1';
  const rows = await queryRows(
    includeInactive
      ? 'SELECT * FROM categories ORDER BY sort_order, name'
      : 'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, name'
  );
  const tree = rows.filter(c => !c.parent_id).map(parent => ({
    ...parent,
    children: rows.filter(c => c.parent_id === parent.id),
  }));
  sendSuccess(res, tree);
}));

/** GET /categories/:slug */
categoryRouter.get('/:slug', asyncHandler(async (req, res) => {
  const cat = await queryOne('SELECT * FROM categories WHERE slug = ? AND is_active = 1', [req.params.slug]);
  if (!cat) return sendSuccess(res, null, 'Category not found');
  sendSuccess(res, cat);
}));

/** POST /categories — admin */
categoryRouter.post('/', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, parent_id, description, image, icon, sort_order } = req.body;
  const slug = createSlug(name);
  await query(
    'INSERT INTO categories (parent_id, name, slug, description, image, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [parent_id || null, name, slug, description || null, image || null, icon || null, sort_order || 0]
  );
  sendCreated(res, null, 'Category created');
}));

/** PUT /categories/:id */
categoryRouter.put('/:id', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, parent_id, description, image, icon, sort_order, is_active } = req.body;
  const fields = [];
  const params = [];
  if (name) { fields.push('name = ?, slug = ?'); params.push(name, createSlug(name)); }
  if (parent_id !== undefined) { fields.push('parent_id = ?'); params.push(parent_id || null); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (image !== undefined) { fields.push('image = ?'); params.push(image); }
  if (icon !== undefined) { fields.push('icon = ?'); params.push(icon); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
  if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (fields.length) { params.push(req.params.id); await query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, params); }
  sendSuccess(res, null, 'Category updated');
}));

/** DELETE /categories/:id */
categoryRouter.delete('/:id', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await query('UPDATE categories SET is_active = 0 WHERE id = ?', [req.params.id]);
  sendSuccess(res, null, 'Category deactivated');
}));

// ─── Brand Router ─────────────────────────────────────────────────────────────
const brandRouter = express.Router();

brandRouter.get('/', asyncHandler(async (req, res) => {
  // ?all=1 returns every brand (incl. inactive) — used by the admin panel;
  // default (public/storefront) only exposes active brands.
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
}));

brandRouter.get('/:slug', asyncHandler(async (req, res) => {
  const brand = await queryOne('SELECT * FROM brands WHERE slug = ? AND is_active = 1', [req.params.slug]);
  sendSuccess(res, brand);
}));

brandRouter.post('/', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, logo, description } = req.body;
  const slug = createSlug(name);
  await query('INSERT INTO brands (name, slug, logo, description) VALUES (?, ?, ?, ?)', [name, slug, logo || null, description || null]);
  sendCreated(res, null, 'Brand created');
}));

brandRouter.put('/:id', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, logo, description, is_active } = req.body;
  const fields = []; const params = [];
  if (name) { fields.push('name = ?, slug = ?'); params.push(name, createSlug(name)); }
  if (logo !== undefined) { fields.push('logo = ?'); params.push(logo); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (fields.length) { params.push(req.params.id); await query(`UPDATE brands SET ${fields.join(', ')} WHERE id = ?`, params); }
  sendSuccess(res, null, 'Brand updated');
}));

brandRouter.delete('/:id', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await query('UPDATE brands SET is_active = 0 WHERE id = ?', [req.params.id]);
  sendSuccess(res, null, 'Brand deactivated');
}));

module.exports = { categoryRouter, brandRouter };

/**
 * Damini Marketplace - Admin Routes (complete)
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response.util');
const { query, queryOne, queryRows } = require('../database/connection');
const { getPagination } = require('../utils/pagination.util');
const paymentService = require('../services/payment.service');

const router = express.Router();
router.use(protect, requireRole('admin'));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [users, vendors, products, orders, revenue, recentOrders, topVendors, monthlyRevenue] = await Promise.all([
    queryOne('SELECT COUNT(*) as total, SUM(DATE(created_at) = CURDATE()) as today FROM users'),
    queryOne("SELECT COUNT(*) as total, SUM(kyc_status = 'pending') as pending, SUM(kyc_status = 'approved') as approved FROM vendors"),
    queryOne("SELECT COUNT(*) as total, SUM(status = 'pending') as pending_approval, SUM(status = 'active') as active FROM products"),
    queryOne(`SELECT COUNT(*) as total, SUM(DATE(created_at) = CURDATE()) as today,
      SUM(status = 'delivered') as delivered, SUM(status = 'cancelled') as cancelled FROM orders`),
    queryOne(`SELECT SUM(total) as total_revenue, SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total ELSE 0 END) as today_revenue
      FROM orders WHERE payment_status = 'paid'`),
    queryRows(`SELECT o.id, o.order_number, o.total, o.status, o.created_at, u.name as customer_name
      FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 5`),
    queryRows(`SELECT v.id, v.store_name, v.rating, v.total_sales, v.total_reviews,
      COUNT(oi.id) as orders FROM vendors v LEFT JOIN order_items oi ON v.id = oi.vendor_id
      WHERE v.kyc_status = 'approved' GROUP BY v.id ORDER BY v.total_sales DESC LIMIT 5`),
    queryRows(`SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(total) as revenue, COUNT(*) as orders
      FROM orders WHERE payment_status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month ORDER BY month`),
  ]);

  sendSuccess(res, { users, vendors, products, orders, revenue, recentOrders, topVendors, monthlyRevenue });
}));

// ─── Vendor Management ────────────────────────────────────────────────────────
router.get('/vendors', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const { offset } = getPagination({ page, limit });
  const conditions = [];
  const params = [];
  if (status) { conditions.push('v.kyc_status = ?'); params.push(status); }
  if (search) { conditions.push('(v.business_name LIKE ? OR u.email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const vendors = await queryRows(
    `SELECT v.*, u.name as owner_name, u.email, u.phone FROM vendors v JOIN users u ON v.user_id = u.id
     ${where} ORDER BY v.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await query(`SELECT COUNT(*) as total FROM vendors v JOIN users u ON v.user_id = u.id ${where}`, params);
  sendPaginated(res, { data: vendors, total, page: +page, limit: +limit });
}));

router.get('/vendors/:id', asyncHandler(async (req, res) => {
  const vendor = await queryOne(
    'SELECT v.*, u.name as owner_name, u.email, u.phone FROM vendors v JOIN users u ON v.user_id = u.id WHERE v.id = ?',
    [req.params.id]
  );
  sendSuccess(res, vendor);
}));

router.patch('/vendors/:id/approve', asyncHandler(async (req, res) => {
  await query("UPDATE vendors SET kyc_status = 'approved' WHERE id = ?", [req.params.id]);
  sendSuccess(res, null, 'Vendor approved');
}));

router.patch('/vendors/:id/reject', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  await query("UPDATE vendors SET kyc_status = 'rejected', kyc_rejected_reason = ? WHERE id = ?", [reason, req.params.id]);
  sendSuccess(res, null, 'Vendor rejected');
}));

router.patch('/vendors/:id/suspend', asyncHandler(async (req, res) => {
  await query('UPDATE vendors SET is_active = 0 WHERE id = ?', [req.params.id]);
  await query("UPDATE users SET is_active = 0 WHERE id = (SELECT user_id FROM vendors WHERE id = ?)", [req.params.id]);
  sendSuccess(res, null, 'Vendor suspended');
}));

// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  const { offset } = getPagination({ page, limit });
  const conditions = [];
  const params = [];
  if (role) { conditions.push('role = ?'); params.push(role); }
  if (search) { conditions.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const users = await queryRows(
    `SELECT id, name, email, phone, role, is_active, is_verified, referral_code, last_login, created_at
     FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await query(`SELECT COUNT(*) as total FROM users ${where}`, params);
  sendPaginated(res, { data: users, total, page: +page, limit: +limit });
}));

router.patch('/users/:id/ban', asyncHandler(async (req, res) => {
  await query('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
  sendSuccess(res, null, 'User banned');
}));

router.patch('/users/:id/unban', asyncHandler(async (req, res) => {
  await query('UPDATE users SET is_active = 1 WHERE id = ?', [req.params.id]);
  sendSuccess(res, null, 'User unbanned');
}));

// ─── Product Management ───────────────────────────────────────────────────────
router.get('/products', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const { offset } = getPagination({ page, limit });
  const conditions = [];
  const params = [];
  if (status) { conditions.push('p.status = ?'); params.push(status); }
  else { conditions.push("p.status IN ('pending','active','rejected','blocked')"); }
  if (search) { conditions.push('p.name LIKE ?'); params.push(`%${search}%`); }
  const where = `WHERE ${conditions.join(' AND ')} AND p.deleted_at IS NULL`;

  const products = await queryRows(
    `SELECT p.id, p.name, p.price, p.mrp, p.stock, p.status, p.rating, p.created_at,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
      v.store_name, c.name as category_name
     FROM products p LEFT JOIN vendors v ON p.vendor_id = v.id LEFT JOIN categories c ON p.category_id = c.id
     ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await query(`SELECT COUNT(*) as total FROM products p ${where}`, params);
  sendPaginated(res, { data: products, total, page: +page, limit: +limit });
}));

// ─── Payouts ──────────────────────────────────────────────────────────────────
router.get('/payouts', asyncHandler(async (req, res) => {
  const payouts = await queryRows(
    `SELECT vp.*, v.store_name, u.name as owner_name, u.email
     FROM vendor_payouts vp JOIN vendors v ON vp.vendor_id = v.id JOIN users u ON v.user_id = u.id
     ORDER BY vp.created_at DESC LIMIT 100`
  );
  sendSuccess(res, payouts);
}));

router.post('/payouts/release', asyncHandler(async (req, res) => {
  const { vendorId, orderIds, amount, transactionRef } = req.body;
  await query(
    'INSERT INTO vendor_payouts (vendor_id, amount, order_ids, status, transaction_ref, initiated_at, completed_at) VALUES (?, ?, ?, "completed", ?, NOW(), NOW())',
    [vendorId, amount, JSON.stringify(orderIds), transactionRef || null]
  );
  sendCreated(res, null, 'Payout released');
}));

// ─── Platform Settings ────────────────────────────────────────────────────────
router.get('/settings', asyncHandler(async (req, res) => {
  const settings = await queryRows('SELECT * FROM platform_settings');
  const obj = {};
  settings.forEach(s => { obj[s.key] = s.value; });
  sendSuccess(res, obj);
}));

router.put('/settings', asyncHandler(async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await query(
      'INSERT INTO platform_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [key, String(value), String(value)]
    );
  }
  sendSuccess(res, null, 'Settings updated');
}));

// ─── Disputes ─────────────────────────────────────────────────────────────────
router.get('/disputes', asyncHandler(async (req, res) => {
  const disputes = await queryRows(
    `SELECT d.*, u.name as customer_name, u.email, o.order_number
     FROM disputes d JOIN users u ON d.user_id = u.id JOIN orders o ON d.order_id = o.id
     ORDER BY d.created_at DESC LIMIT 100`
  );
  sendSuccess(res, disputes);
}));

router.patch('/disputes/:id/resolve', asyncHandler(async (req, res) => {
  const { resolution } = req.body;
  await query(
    "UPDATE disputes SET status = 'resolved', resolution = ?, resolved_by = ?, resolved_at = NOW() WHERE id = ?",
    [resolution, req.user.id, req.params.id]
  );
  sendSuccess(res, null, 'Dispute resolved');
}));

// ─── Festival Sales ───────────────────────────────────────────────────────────
router.get('/festival-sales', asyncHandler(async (req, res) => {
  const sales = await queryRows('SELECT * FROM festival_sales ORDER BY starts_at DESC');
  sendSuccess(res, sales);
}));

router.post('/festival-sales', asyncHandler(async (req, res) => {
  const { name, description, banner, starts_at, ends_at } = req.body;
  await query('INSERT INTO festival_sales (name, description, banner, starts_at, ends_at) VALUES (?, ?, ?, ?, ?)',
    [name, description || null, banner || null, starts_at, ends_at]);
  sendCreated(res, null, 'Festival sale created');
}));

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports/sales', asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];

  const data = await queryRows(
    `SELECT DATE(o.created_at) as date, COUNT(*) as orders, SUM(o.total) as revenue,
      SUM(o.discount) as discounts, SUM(o.shipping_charges) as shipping
     FROM orders o WHERE o.created_at BETWEEN ? AND ? AND o.payment_status = 'paid'
     GROUP BY DATE(o.created_at) ORDER BY date`,
    [fromDate, toDate]
  );
  sendSuccess(res, data);
}));

router.get('/reports/vendors', asyncHandler(async (req, res) => {
  const data = await queryRows(
    `SELECT v.store_name, u.email, v.total_sales, v.rating,
      COUNT(DISTINCT oi.order_id) as total_orders,
      SUM(oi.commission_amount) as platform_earnings
     FROM vendors v JOIN users u ON v.user_id = u.id
     LEFT JOIN order_items oi ON v.id = oi.vendor_id
     WHERE v.kyc_status = 'approved'
     GROUP BY v.id ORDER BY v.total_sales DESC LIMIT 100`
  );
  sendSuccess(res, data);
}));

module.exports = router;

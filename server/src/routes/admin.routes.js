/**
 * Damini Marketplace - Admin Routes (complete)
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('config');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendPaginated, sendError } = require('../utils/response.util');
const { query, queryOne, queryRows } = require('../database/connection');
const { getPagination } = require('../utils/pagination.util');
const { clearShippingCache } = require('../utils/shipping.util');
const paymentService = require('../services/payment.service');
const notificationService = require('../services/notification.service');

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

// ─── Pending Counts (for sidebar badges) ──────────────────────────────────────
router.get('/dashboard/pending-counts', asyncHandler(async (req, res) => {
  const [[vendorCounts]] = await query("SELECT COUNT(*) as pending_vendors FROM vendors WHERE kyc_status = 'pending'");
  const [[productCounts]] = await query("SELECT COUNT(*) as pending_products FROM products WHERE status = 'pending' AND deleted_at IS NULL");
  sendSuccess(res, {
    pending_vendors: vendorCounts.pending_vendors || 0,
    pending_products: productCounts.pending_products || 0,
    total_pending: (vendorCounts.pending_vendors || 0) + (productCounts.pending_products || 0),
  });
}));

// ─── Vendor Management ────────────────────────────────────────────────────────
router.get('/vendors', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, kyc_status, search } = req.query;
  const { offset } = getPagination({ page, limit });
  const conditions = [];
  const params = [];
  const statusFilter = status || kyc_status;
  if (statusFilter) { conditions.push('v.kyc_status = ?'); params.push(statusFilter); }
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

/** GET /admin/vendors/pending-updates?status=pending&vendor_id= */
router.get('/vendors/pending-updates', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, vendor_id } = req.query;
  const { offset } = getPagination({ page, limit });
  const conditions = [];
  const params = [];
  if (status) { conditions.push('vpu.status = ?'); params.push(status); }
  if (vendor_id) { conditions.push('vpu.vendor_id = ?'); params.push(vendor_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows, countRows] = await Promise.all([
    queryRows(
      `SELECT vpu.*, v.store_name, v.business_name, u.email, u.name as owner_name
       FROM vendor_pending_updates vpu
       JOIN vendors v ON vpu.vendor_id = v.id
       JOIN users u ON vpu.user_id = u.id
       ${where} ORDER BY vpu.created_at DESC LIMIT ? OFFSET ?`,
      [...params, +limit, offset]
    ),
    queryRows(`SELECT COUNT(*) AS total FROM vendor_pending_updates vpu ${where}`, params),
  ]);
  const updates = rows.map((r) => ({
    ...r,
    changes: typeof r.changes === 'string' ? JSON.parse(r.changes) : r.changes,
    old_values: typeof r.old_values === 'string' ? JSON.parse(r.old_values || '{}') : r.old_values,
  }));
  sendPaginated(res, { updates, total: countRows[0]?.total || 0, message: 'Pending updates fetched' });
}));

router.get('/vendors/:id', asyncHandler(async (req, res) => {
  const vendor = await queryOne(
    'SELECT v.*, u.name as owner_name, u.email, u.phone, u.role as user_role, u.is_active as user_active, u.is_verified as user_verified FROM vendors v JOIN users u ON v.user_id = u.id WHERE v.id = ?',
    [req.params.id]
  );
  sendSuccess(res, vendor);
}));

/** GET /admin/vendors/:id/documents/:filename — serve decrypted KYC document */
router.get('/vendors/:id/documents/:filename', asyncHandler(async (req, res) => {
  const KYC_DOC_FIELDS = [
    'gst_certificate', 'pan_image', 'aadhar_image_front', 'aadhar_image_back',
    'passport_photo', 'udyam_certificate', 'bank_passbook', 'cancelled_cheque',
  ];

  const vendor = await queryOne(
    `SELECT id, ${KYC_DOC_FIELDS.join(', ')} FROM vendors WHERE id = ?`,
    [req.params.id]
  );
  if (!vendor) return sendError(res, 'Vendor not found', 404);

  // The requested file must belong to this vendor
  const allowed = KYC_DOC_FIELDS
    .map((f) => vendor[f])
    .filter(Boolean)
    .map((p) => p.split('/').pop());
  if (!allowed.includes(req.params.filename)) {
    return sendError(res, 'Document not found for this vendor', 404);
  }

  const { decrypt } = require('../utils/encryption.util');
  const filePath = path.join(process.cwd(), config.get('app.uploadDir'), 'kyc', req.params.filename);
  if (!fs.existsSync(filePath)) return sendError(res, 'File not found', 404);

  const encrypted = fs.readFileSync(filePath);
  const decrypted = decrypt(encrypted);
  const ext = path.extname(req.params.filename).toLowerCase();
  const mime = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  res.set('Content-Type', mime);
  res.set('Content-Disposition', `inline; filename="${req.params.filename}"`);
  res.send(decrypted);
}));

router.patch('/vendors/:id/approve', asyncHandler(async (req, res) => {
  const vendor = await queryOne(
    `SELECT v.id, v.store_name, v.kyc_status, u.email, u.name FROM vendors v
     JOIN users u ON v.user_id = u.id WHERE v.id = ?`,
    [req.params.id]
  );
  if (!vendor) return sendError(res, 'Vendor not found', 404);

  // Already approved — never re-approve or re-send the email
  if (vendor.kyc_status === 'approved') {
    return sendSuccess(res, null, 'Vendor already approved');
  }

  await query("UPDATE vendors SET kyc_status = 'approved' WHERE id = ?", [req.params.id]);
  // Grant the vendor role only on approval so the vendor can log in to the portal
  await query(
    "UPDATE users SET role = 'vendor' WHERE id = (SELECT user_id FROM vendors WHERE id = ?)",
    [req.params.id]
  );
  if (vendor.email) {
    const emailService = require('../services/email.service');
    emailService.sendVendorApprovedEmail(vendor.email, vendor.name || 'Seller', vendor.store_name || 'Your Store')
      .catch(() => {});
  }
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

router.patch('/vendors/:id/unsuspend', asyncHandler(async (req, res) => {
  await query('UPDATE vendors SET is_active = 1 WHERE id = ?', [req.params.id]);
  await query("UPDATE users SET is_active = 1 WHERE id = (SELECT user_id FROM vendors WHERE id = ?)", [req.params.id]);
  sendSuccess(res, null, 'Vendor reinstated');
}));

// ─── Vendor Pending Updates (approval workflow) ───────────────────────────────
const PENDING_UPDATE_COLUMNS = [
  'business_name', 'business_type', 'business_email', 'gst_number', 'pan_number',
  'bank_name', 'account_number', 'ifsc_code', 'account_holder',
  'pickup_name', 'pickup_phone', 'pickup_line1', 'pickup_line2', 'pickup_city', 'pickup_state', 'pickup_pincode',
  'gst_certificate', 'pan_image', 'aadhar_image_front', 'aadhar_image_back',
  'passport_photo', 'udyam_certificate', 'bank_passbook', 'cancelled_cheque',
];

/** POST /admin/vendors/pending-updates/:id/approve */
router.post('/vendors/pending-updates/:id/approve', asyncHandler(async (req, res) => {
  const pending = await queryOne(
    `SELECT vpu.*, v.store_name FROM vendor_pending_updates vpu JOIN vendors v ON vpu.vendor_id = v.id WHERE vpu.id = ?`,
    [req.params.id]
  );
  if (!pending) return sendError(res, 'Pending update not found', 404);
  if (pending.status !== 'pending') return sendError(res, 'This update has already been reviewed', 400);

  const changes = typeof pending.changes === 'string' ? JSON.parse(pending.changes) : (pending.changes || {});
  const valid = {};
  for (const key of Object.keys(changes)) {
    if (PENDING_UPDATE_COLUMNS.includes(key)) valid[key] = changes[key] ?? null;
  }
  if (Object.keys(valid).length === 0) {
    return sendError(res, 'No valid fields to apply', 400);
  }

  const setSql = Object.keys(valid).map((k) => `${k} = ?`).join(', ');
  const params = Object.values(valid);
  await query(`UPDATE vendors SET ${setSql}, updated_at = NOW() WHERE id = ?`, [...params, pending.vendor_id]);
  await query(
    "UPDATE vendor_pending_updates SET status = 'approved', admin_id = ?, reviewed_at = NOW() WHERE id = ?",
    [req.user.id, req.params.id]
  );

  try {
    await notificationService.createNotification(pending.user_id, {
      title: 'Update Approved',
      message: `Your ${pending.section} update${Object.keys(valid).length > 1 ? 's' : ''} for "${pending.store_name || 'your store'}" ${Object.keys(valid).length > 1 ? 'have' : 'has'} been approved and applied.`,
      type: 'system',
      referenceId: pending.id,
      referenceType: 'vendor_update',
    });
  } catch (e) {}

  sendSuccess(res, null, 'Update approved and applied');
}));

/** POST /admin/vendors/pending-updates/:id/reject */
router.post('/vendors/pending-updates/:id/reject', asyncHandler(async (req, res) => {
  const { note } = req.body;
  const pending = await queryOne(
    `SELECT vpu.*, v.store_name FROM vendor_pending_updates vpu JOIN vendors v ON vpu.vendor_id = v.id WHERE vpu.id = ?`,
    [req.params.id]
  );
  if (!pending) return sendError(res, 'Pending update not found', 404);
  if (pending.status !== 'pending') return sendError(res, 'This update has already been reviewed', 400);

  await query(
    "UPDATE vendor_pending_updates SET status = 'rejected', admin_id = ?, admin_note = ?, reviewed_at = NOW() WHERE id = ?",
    [req.user.id, note || null, req.params.id]
  );

  try {
    await notificationService.createNotification(pending.user_id, {
      title: 'Update Rejected',
      message: `Your ${pending.section} update${note ? ` was rejected: ${note}` : ' was rejected. Please review and resubmit.'}`,
      type: 'system',
      referenceId: pending.id,
      referenceType: 'vendor_update',
    });
  } catch (e) {}

  sendSuccess(res, null, 'Update rejected');
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
    `SELECT p.id, p.name, p.sku, p.price, p.mrp, p.stock, p.status, p.rating, p.is_featured, p.created_at,
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
  const vendorUser = await queryOne('SELECT user_id FROM vendors WHERE id = ?', [vendorId]);
  if (vendorUser) {
    try {
      await notificationService.createNotification(vendorUser.user_id, {
        title: 'Payout Released',
        message: `Your payout of ₹${parseFloat(amount || 0).toFixed(2)} has been released. It will reflect in your bank account within 1-2 business days.`,
        type: 'payment',
        referenceId: null,
        referenceType: 'payout',
      });
    } catch (e) {}
  }
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
  clearShippingCache();
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

router.put('/festival-sales/:id', asyncHandler(async (req, res) => {
  const { name, description, banner, starts_at, ends_at, is_active } = req.body;
  await query(
    'UPDATE festival_sales SET name=?, description=?, banner=?, starts_at=?, ends_at=?, is_active=? WHERE id=?',
    [name, description || null, banner || null, starts_at, ends_at, is_active ?? 1, req.params.id]
  );
  sendSuccess(res, null, 'Festival sale updated');
}));

router.delete('/festival-sales/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM festival_sales WHERE id = ?', [req.params.id]);
  sendSuccess(res, null, 'Festival sale deleted');
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

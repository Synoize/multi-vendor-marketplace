/**
 * Damini Marketplace - Vendor Routes (complete)
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('config');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { attachVendor } = require('../middlewares/vendor.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response.util');
const { query, queryOne, queryRows } = require('../database/connection');
const { uploadKYC, uploadStoreBranding } = require('../middlewares/upload.middleware');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/email.service');
const { generateOTP } = require('../utils/sku.util');
const logger = require('../utils/logger.util');
const productService = require('../services/product.service');
const orderService = require('../services/order.service');

const router = express.Router();
const vendorProtect = [protect, requireRole('vendor'), attachVendor];

/** GET /vendors/profile */
router.get('/profile', ...vendorProtect, asyncHandler(async (req, res) => {
  sendSuccess(res, req.vendor);
}));

/** PUT /vendors/profile */
router.put('/profile', ...vendorProtect, asyncHandler(async (req, res) => {
  const { store_name, store_description } = req.body;
  await query(
    'UPDATE vendors SET store_name = ?, store_description = ? WHERE id = ?',
    [store_name ?? null, store_description ?? null, req.vendor.id]
  );
  sendSuccess(res, null, 'Profile updated');
}));

/** POST /vendors/branding — upload store logo / banner */
router.post('/branding', ...vendorProtect, uploadStoreBranding, asyncHandler(async (req, res) => {
  const files = req.files || {};
  const updates = [];
  const params = [];

  const setField = (field, file) => {
    const url = `/uploads/stores/${file.filename}`;
    updates.push(`${field} = ?`);
    params.push(url);
    const oldUrl = req.vendor[field];
    if (oldUrl && !oldUrl.startsWith('http')) {
      const oldFile = path.join(process.cwd(), config.get('app.uploadDir'), 'stores', path.basename(oldUrl));
      fs.promises.unlink(oldFile).catch(() => { /* best-effort */ });
    }
  };

  if (files.logo?.[0]) setField('store_logo', files.logo[0]);
  if (files.banner?.[0]) setField('store_banner', files.banner[0]);

  if (updates.length === 0) return sendError(res, 'Upload a logo or banner image', 400);

  params.push(req.vendor.id);
  await query(`UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`, params);

  const updated = await queryOne('SELECT * FROM vendors WHERE id = ?', [req.vendor.id]);
  sendSuccess(res, updated, 'Store branding updated');
}));

// ─── Pending Update (approval-required) ──────────────────────────────────────
// Important fields (bank, pickup, business, documents) are NOT written directly.
// They are queued in vendor_pending_updates and applied only after admin approval.

const PENDING_UPDATE_SECTIONS = {
  business: ['business_name', 'business_type', 'business_email', 'gst_number', 'pan_number'],
  bank: ['bank_name', 'account_number', 'ifsc_code', 'account_holder'],
  pickup: ['pickup_name', 'pickup_phone', 'pickup_line1', 'pickup_line2', 'pickup_city', 'pickup_state', 'pickup_pincode'],
};

/** POST /vendors/pending-update — queue important field changes for admin approval */
router.post('/pending-update', ...vendorProtect, asyncHandler(async (req, res) => {
  const { section, changes } = req.body;
  const allowedFields = PENDING_UPDATE_SECTIONS[section];
  if (!allowedFields) {
    return sendError(res, 'Invalid section. Must be one of: bank, pickup, business', 400);
  }
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    return sendError(res, 'changes object is required', 400);
  }

  const filtered = {};
  for (const key of Object.keys(changes)) {
    if (!allowedFields.includes(key)) {
      return sendError(res, `Field "${key}" is not allowed in section "${section}"`, 400);
    }
    const val = changes[key];
    if (typeof val === 'string' && val.trim() !== '') filtered[key] = val.trim();
  }
  if (Object.keys(filtered).length === 0) {
    return sendError(res, 'No valid changes provided', 400);
  }

  const oldValues = {};
  for (const key of Object.keys(filtered)) {
    oldValues[key] = req.vendor[key] ?? null;
  }

  const id = uuidv4();
  await query(
    `INSERT INTO vendor_pending_updates (id, vendor_id, user_id, section, changes, old_values)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, req.vendor.id, req.user.id, section, JSON.stringify(filtered), JSON.stringify(oldValues)]
  );

  const pending = await queryOne('SELECT * FROM vendor_pending_updates WHERE id = ?', [id]);
  sendCreated(res, pending, 'Update submitted for admin approval');
}));

/** GET /vendors/pending-updates — list this vendor's update requests */
router.get('/pending-updates', ...vendorProtect, asyncHandler(async (req, res) => {
  const { status } = req.query;
  const params = [req.vendor.id];
  let sql = 'SELECT * FROM vendor_pending_updates WHERE vendor_id = ?';
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC LIMIT 50';
  const rows = await queryRows(sql, params);
  const parsed = rows.map((r) => ({
    ...r,
    changes: typeof r.changes === 'string' ? JSON.parse(r.changes) : r.changes,
    old_values: typeof r.old_values === 'string' ? JSON.parse(r.old_values || '{}') : r.old_values,
  }));
  sendSuccess(res, parsed);
}));

/** DELETE /vendors/pending-updates/:id — cancel an own pending update */
router.delete('/pending-updates/:id', ...vendorProtect, asyncHandler(async (req, res) => {
  const result = await query(
    "UPDATE vendor_pending_updates SET status = 'rejected', admin_note = 'Cancelled by vendor', reviewed_at = NOW() WHERE id = ? AND vendor_id = ? AND status = 'pending'",
    [req.params.id, req.vendor.id]
  );
  if (!result[0]?.affectedRows) return sendError(res, 'Pending update not found', 404);
  sendSuccess(res, null, 'Update request cancelled');
}));

/** POST /vendors/pending-documents — queue KYC document changes for admin approval */
router.post('/pending-documents', ...vendorProtect, uploadKYC, asyncHandler(async (req, res) => {
  const files = req.files || {};
  const changes = {};
  const DOC_FIELDS = ['gst_certificate', 'pan_image', 'aadhar_image_front', 'aadhar_image_back', 'passport_photo', 'udyam_certificate', 'bank_passbook', 'cancelled_cheque'];
  for (const field of DOC_FIELDS) {
    if (files[field]?.[0]) {
      changes[field] = `/uploads/kyc/${files[field][0].filename}`;
    }
  }
  if (Object.keys(changes).length === 0) {
    return sendError(res, 'No documents uploaded', 400);
  }

  const oldValues = {};
  for (const key of Object.keys(changes)) {
    oldValues[key] = req.vendor[key] ?? null;
  }

  const id = uuidv4();
  await query(
    `INSERT INTO vendor_pending_updates (id, vendor_id, user_id, section, changes, old_values)
     VALUES (?, ?, ?, 'documents', ?, ?)`,
    [id, req.vendor.id, req.user.id, JSON.stringify(changes), JSON.stringify(oldValues)]
  );

  const pending = await queryOne('SELECT * FROM vendor_pending_updates WHERE id = ?', [id]);
  sendCreated(res, pending, 'Documents submitted for admin approval');
}));

/** POST /vendors/send-business-otp — send OTP to business email (no vendor role needed) */
router.post('/send-business-otp', protect, asyncHandler(async (req, res) => {
  const { business_email } = req.body;
  if (!business_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(business_email)) {
    return sendError(res, 'Valid business email is required', 400);
  }
  // Ensure a vendor record exists for this user
  let vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  if (!vendor) {
    await query('INSERT INTO vendors (id, user_id) VALUES (UUID(), ?)', [req.user.id]);
    vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  }
  const otp = generateOTP(6);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const mysqlExpiry = `${expiresAt.getFullYear()}-${pad(expiresAt.getMonth() + 1)}-${pad(expiresAt.getDate())} ${pad(expiresAt.getHours())}:${pad(expiresAt.getMinutes())}:${pad(expiresAt.getSeconds())}`;
  await query(
    'UPDATE vendors SET business_email = ?, business_email_otp = ?, business_email_otp_expires = ? WHERE id = ?',
    [business_email, otp, mysqlExpiry, vendor.id]
  );
  try {
    await emailService.sendOTPEmail(business_email, 'Seller', otp);
  } catch (e) {
    logger.error('Failed to send business email OTP:', e.message);
  }
  sendSuccess(res, null, 'OTP sent to business email');
}));

/** POST /vendors/verify-business-otp — verify OTP for business email (no vendor role needed) */
router.post('/verify-business-otp', protect, asyncHandler(async (req, res) => {
  const { otp } = req.body;
  if (!otp) return sendError(res, 'OTP is required', 400);
  const vendor = await queryOne(
    'SELECT business_email, business_email_otp, business_email_otp_expires FROM vendors WHERE user_id = ?',
    [req.user.id]
  );
  if (!vendor) return sendError(res, 'Vendor profile not found', 404);
  if (!vendor.business_email_otp) return sendError(res, 'No OTP found. Request a new one.', 400);
  if (new Date() > new Date(vendor.business_email_otp_expires)) {
    return sendError(res, 'OTP expired. Request a new one.', 400);
  }
  if (String(vendor.business_email_otp) !== String(otp)) {
    return sendError(res, 'Invalid OTP', 400);
  }
  await query(
    'UPDATE vendors SET business_email_verified = 1, business_email_otp = NULL, business_email_otp_expires = NULL WHERE user_id = ?',
    [req.user.id]
  );
  sendSuccess(res, null, 'Business email verified');
}));

/** POST /vendors/kyc — submit KYC (creates vendor record if needed, grants vendor role) */
router.post('/kyc', protect, uploadKYC, asyncHandler(async (req, res) => {
  const { gst_number, pan_number, business_name, business_type, business_email, store_name, store_description,
    bank_name, account_number, ifsc_code, account_holder,
    pickup_name, pickup_phone, pickup_line1, pickup_city, pickup_state, pickup_pincode } = req.body;

  // Find or create vendor record
  let vendor = await queryOne('SELECT * FROM vendors WHERE user_id = ?', [req.user.id]);
  if (!vendor) {
    await query('INSERT INTO vendors (id, user_id) VALUES (UUID(), ?)', [req.user.id]);
    vendor = await queryOne('SELECT * FROM vendors WHERE user_id = ?', [req.user.id]);
  }

  // Require business email verification
  if (!vendor.business_email_verified && !business_email) {
    return sendError(res, 'Business email is required and must be verified', 400);
  }
  const targetEmail = business_email || vendor.business_email;
  if (!targetEmail) {
    return sendError(res, 'Business email is required', 400);
  }

  const files = req.files || {};
  const getUrl = (field) => files[field]?.[0] ? `/uploads/kyc/${files[field][0].filename}` : null;

  const updates = {
    gst_number, pan_number, business_name, business_type,
    business_email: targetEmail,
    store_name, store_description,
    bank_name, account_number, ifsc_code, account_holder,
    pickup_name, pickup_phone, pickup_line1, pickup_city, pickup_state, pickup_pincode,
    kyc_status: 'pending',
  };
  if (getUrl('gst_certificate')) updates.gst_certificate = getUrl('gst_certificate');
  if (getUrl('pan_image')) updates.pan_image = getUrl('pan_image');
  if (getUrl('aadhar_image_front')) updates.aadhar_image_front = getUrl('aadhar_image_front');
  if (getUrl('aadhar_image_back')) updates.aadhar_image_back = getUrl('aadhar_image_back');
  if (getUrl('passport_photo')) updates.passport_photo = getUrl('passport_photo');
  if (getUrl('udyam_certificate')) updates.udyam_certificate = getUrl('udyam_certificate');
  if (getUrl('bank_passbook')) updates.bank_passbook = getUrl('bank_passbook');
  if (getUrl('cancelled_cheque')) updates.cancelled_cheque = getUrl('cancelled_cheque');

  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const params = [...Object.values(updates).map(v => v ?? null), vendor.id];
  await query(`UPDATE vendors SET ${fields} WHERE id = ?`, params);

  sendSuccess(res, null, 'KYC submitted for review');
}));

/** GET /vendors/kyc/:filename — serve decrypted KYC file */
router.get('/kyc/:filename', ...vendorProtect, asyncHandler(async (req, res) => {
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

/** GET /vendors/dashboard */
router.get('/dashboard', ...vendorProtect, asyncHandler(async (req, res) => {
  const vendorId = req.vendor.id;

  const [stats, recentOrders, lowStock, monthlyRevenue] = await Promise.all([
    queryOne(
      `SELECT
        (SELECT COUNT(*) FROM products WHERE vendor_id = ? AND deleted_at IS NULL) as total_products,
        (SELECT COUNT(*) FROM order_items WHERE vendor_id = ?) as total_orders,
        (SELECT SUM(total_price) FROM order_items WHERE vendor_id = ? AND status = 'delivered') as total_revenue,
        (SELECT COUNT(*) FROM order_items WHERE vendor_id = ? AND status IN ('placed','confirmed','processing')) as active_orders,
        (SELECT COALESCE(rating, 0) FROM vendors WHERE id = ?) as rating`,
      [vendorId, vendorId, vendorId, vendorId, vendorId]
    ),
    queryRows(
      `SELECT oi.id, oi.product_name, oi.quantity, oi.total_price, oi.status, o.order_number, o.created_at
       FROM order_items oi JOIN orders o ON oi.order_id = o.id
       WHERE oi.vendor_id = ? ORDER BY o.created_at DESC LIMIT 5`, [vendorId]
    ),
    productService.getLowStockProducts(vendorId),
    queryRows(
      `SELECT DATE_FORMAT(o.created_at, '%Y-%m') as month,
        SUM(oi.total_price) as revenue, COUNT(DISTINCT oi.order_id) as orders
       FROM order_items oi JOIN orders o ON oi.order_id = o.id
       WHERE oi.vendor_id = ? AND oi.status = 'delivered'
         AND o.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month`, [vendorId]
    ),
  ]);

  sendSuccess(res, { stats, recentOrders, lowStock, monthlyRevenue });
}));

/** GET /vendors/products */
router.get('/products', ...vendorProtect, asyncHandler(async (req, res) => {
  const result = await productService.getVendorProducts(req.vendor.id, req.query);
  sendPaginated(res, { ...result, message: 'Products fetched' });
}));

/** GET /vendors/orders */
router.get('/orders', ...vendorProtect, asyncHandler(async (req, res) => {
  const result = await orderService.getVendorOrders(req.vendor.id, req.query);
  sendPaginated(res, { ...result, message: 'Orders fetched' });
}));

/** GET /vendors/payouts */
router.get('/payouts', ...vendorProtect, asyncHandler(async (req, res) => {
  const payouts = await queryRows(
    'SELECT * FROM vendor_payouts WHERE vendor_id = ? ORDER BY created_at DESC',
    [req.vendor.id]
  );
  const pending = await queryOne(
    `SELECT SUM(vendor_payout) as pending
     FROM order_items WHERE vendor_id = ? AND status = 'delivered'
       AND order_id NOT IN (SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(order_ids, '$[*]')) FROM vendor_payouts WHERE vendor_id = ?)`,
    [req.vendor.id, req.vendor.id]
  );
  sendSuccess(res, { payouts, pendingAmount: pending?.pending || 0 });
}));

/** GET /vendors/analytics */
router.get('/analytics', ...vendorProtect, asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const days = Math.min(365, Math.max(7, parseInt(period)));

  const [revenue, topProducts, orderStatus] = await Promise.all([
    queryRows(
      `SELECT DATE(o.created_at) as date, SUM(oi.total_price) as revenue, COUNT(*) as orders
       FROM order_items oi JOIN orders o ON oi.order_id = o.id
       WHERE oi.vendor_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(o.created_at) ORDER BY date`, [req.vendor.id, days]
    ),
    queryRows(
      `SELECT p.name, p.slug, SUM(oi.quantity) as units_sold, SUM(oi.total_price) as revenue,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
       FROM order_items oi JOIN products p ON oi.product_id = p.id
       WHERE oi.vendor_id = ? GROUP BY p.id ORDER BY revenue DESC LIMIT 5`, [req.vendor.id]
    ),
    queryOne(
      `SELECT
        SUM(status = 'placed') as placed, SUM(status = 'processing') as processing,
        SUM(status = 'shipped') as shipped, SUM(status = 'delivered') as delivered,
        SUM(status = 'cancelled') as cancelled
       FROM order_items WHERE vendor_id = ?`, [req.vendor.id]
    ),
  ]);

  sendSuccess(res, { revenue, topProducts, orderStatus });
}));

/** GET /vendors/notifications */
router.get('/notifications', ...vendorProtect, asyncHandler(async (req, res) => {
  const notifs = await queryRows(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [req.user.id]
  );
  sendSuccess(res, notifs);
}));

// ─── Public vendor store ─────────────────────────────────────────────────────
/** GET /vendors/:vendorId/store */
router.get('/:vendorId/store', asyncHandler(async (req, res) => {
  const vendor = await queryOne(
    `SELECT v.id, v.store_name, v.store_logo, v.store_banner, v.store_description, v.rating, v.total_reviews, v.total_sales, v.created_at
     FROM vendors v WHERE v.id = ? AND v.is_active = 1 AND v.kyc_status = 'approved'`,
    [req.params.vendorId]
  );
  if (!vendor) return sendError(res, 'Store not found', 404);

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const products = await queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.rating, p.total_reviews, p.stock, p.is_featured, p.sale_count,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
     FROM products p
     WHERE p.vendor_id = ? AND p.status = 'active' AND p.deleted_at IS NULL
     ORDER BY p.is_featured DESC, p.created_at DESC
     LIMIT ? OFFSET ?`,
    [vendor.id, limit, offset]
  );

  const [countRow] = await queryRows(
    `SELECT COUNT(*) as total FROM products WHERE vendor_id = ? AND status = 'active' AND deleted_at IS NULL`,
    [vendor.id]
  );

  sendSuccess(res, { ...vendor, products, totalProducts: countRow?.total || 0, page, limit });
}));

module.exports = router;

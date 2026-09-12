/**
 * Damini Marketplace - Vendor Controller
 */

const path = require('path');
const fs = require('fs');
const config = require('config');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response.util');
const { query, queryOne, queryRows } = require('../database/connection');
const { getCursorPagination, encodeCursor } = require('../utils/pagination.util');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/email.service');
const { generateOTP } = require('../utils/sku.util');
const logger = require('../utils/logger.util');
const productService = require('../services/product.service');
const orderService = require('../services/order.service');

// Important fields (bank, pickup, business, documents) are NOT written directly.
// They are queued in vendor_pending_updates and applied only after admin approval.
const PENDING_UPDATE_SECTIONS = {
  business: ['business_name', 'business_type', 'business_email', 'gst_number', 'fssai_number', 'pan_number'],
  bank: ['bank_name', 'account_number', 'ifsc_code', 'account_holder'],
  pickup: ['pickup_name', 'pickup_phone', 'pickup_line1', 'pickup_line2', 'pickup_city', 'pickup_state', 'pickup_pincode'],
};

/** GET /vendors/profile */
const getProfile = asyncHandler(async (req, res) => {
  const settingRow = await queryOne(
    "SELECT `value` FROM platform_settings WHERE `key` = 'commission_rate'"
  );
  const platformCommissionRate =
    settingRow && settingRow.value != null ? parseFloat(settingRow.value) : 5;
  const vendorRate = req.vendor.commission_rate;
  const effectiveCommissionRate =
    vendorRate != null && vendorRate !== ''
      ? parseFloat(vendorRate)
      : platformCommissionRate;
  sendSuccess(res, {
    ...req.vendor,
    platform_commission_rate: platformCommissionRate,
    effective_commission_rate: effectiveCommissionRate,
  });
});

/** PUT /vendors/profile */
const updateProfile = asyncHandler(async (req, res) => {
  const { store_name, store_description } = req.body;
  await query(
    'UPDATE vendors SET store_name = ?, store_description = ? WHERE id = ?',
    [store_name ?? null, store_description ?? null, req.vendor.id]
  );
  sendSuccess(res, null, 'Profile updated');
});

/** POST /vendors/branding — upload store logo / banner */
const updateBranding = asyncHandler(async (req, res) => {
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
});

// ─── Pending Update (approval-required) ───────────────────────────────────────

/** POST /vendors/pending-update — queue important field changes for admin approval */
const createPendingUpdate = asyncHandler(async (req, res) => {
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
    if (typeof val === 'string' && val.trim() !== '') {
      const UPPERCASE_FIELDS = ['gst_number', 'fssai_number', 'pan_number', 'account_number', 'ifsc_code'];
      filtered[key] = UPPERCASE_FIELDS.includes(key) ? val.trim().toUpperCase() : val.trim();
    }
  }
  if (Object.keys(filtered).length === 0) {
    return sendError(res, 'No valid changes provided', 400);
  }

  if (filtered.gst_number) {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
    if (!gstinRegex.test(filtered.gst_number)) {
      return sendError(res, 'Invalid GSTIN format. Must be 15 characters: 2 digits (state) + 5 letters (PAN) + 4 digits + 1 letter + Z + 1 alphanumeric', 400);
    }
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
});

/** GET /vendors/pending-updates — list this vendor's update requests */
const getPendingUpdates = asyncHandler(async (req, res) => {
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
});

/** DELETE /vendors/pending-updates/:id — cancel an own pending update */
const cancelPendingUpdate = asyncHandler(async (req, res) => {
  const result = await query(
    "UPDATE vendor_pending_updates SET status = 'rejected', admin_note = 'Cancelled by vendor', reviewed_at = NOW() WHERE id = ? AND vendor_id = ? AND status = 'pending'",
    [req.params.id, req.vendor.id]
  );
  if (!result[0]?.affectedRows) return sendError(res, 'Pending update not found', 404);
  sendSuccess(res, null, 'Update request cancelled');
});

/** POST /vendors/pending-documents — queue KYC document changes for admin approval */
const createPendingDocuments = asyncHandler(async (req, res) => {
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
});

// ─── Business email OTP ───────────────────────────────────────────────────────

/** POST /vendors/send-business-otp — send OTP to business email (no vendor role needed) */
const sendBusinessOTP = asyncHandler(async (req, res) => {
  const { business_email } = req.body;
  if (!business_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(business_email)) {
    return sendError(res, 'Valid business email is required', 400);
  }
  // Ensure a vendor record exists for this user
  let vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  if (!vendor) {
    await query('INSERT INTO vendors (id, user_id, business_name) VALUES (UUID(), ?, ?)', [req.user.id, '']);
    vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  }
  const otp = generateOTP(6);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await query(
    'UPDATE vendors SET business_email = ?, business_email_otp = ?, business_email_otp_expires = ? WHERE id = ?',
    [business_email, otp, expiresAt, vendor.id]
  );
  try {
    await emailService.sendOTPEmail(business_email, 'Seller', otp);
  } catch (e) {
    logger.error('Failed to send business email OTP:', e.message);
    return sendError(res, 'Failed to send OTP to business email. Please try again.', 500);
  }
  sendSuccess(res, null, 'OTP sent to business email');
});

/** POST /vendors/verify-business-otp — verify OTP for business email (no vendor role needed) */
const verifyBusinessOTP = asyncHandler(async (req, res) => {
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
});

// ─── KYC ──────────────────────────────────────────────────────────────────────

/** GET /vendors/kyc — return current user's existing vendor data for re-apply prefill (no vendor role needed) */
const getKYC = asyncHandler(async (req, res) => {
  const vendor = await queryOne(
    `SELECT business_name, business_type, business_email, business_email_verified,
            gst_number, fssai_number, pan_number,
            store_name, store_description,
            bank_name, account_number, ifsc_code, account_holder,
            pickup_name, pickup_phone, pickup_line1, pickup_line2, pickup_city, pickup_state, pickup_pincode,
            gst_certificate, pan_image, aadhar_image_front, aadhar_image_back,
            passport_photo, udyam_certificate, bank_passbook, cancelled_cheque
     FROM vendors WHERE user_id = ?`,
    [req.user.id]
  );
  sendSuccess(res, vendor || null);
});

/**
 * POST /vendors/kyc — submit a COMPLETE KYC application.
 * Only fully-completed applications are marked kyc_status='pending' (shown to admins).
 * Partial/incomplete submissions are rejected and never granted 'pending', so they
 * do not appear on the admin approval page.
 */
const submitKYC = asyncHandler(async (req, res) => {
  const { gst_number, fssai_number, pan_number, business_name, business_type, business_email, store_name, store_description,
    bank_name, account_number, ifsc_code, account_holder,
    pickup_name, pickup_phone, pickup_line1, pickup_city, pickup_state, pickup_pincode } = req.body;
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

  const files = req.files || {};
  const getUrl = (field) => files[field]?.[0] ? `/uploads/kyc/${files[field][0].filename}` : null;

  const vendor = await queryOne('SELECT * FROM vendors WHERE user_id = ?', [req.user.id]);

  // ─── Completeness check (mirrors the 5-step seller registration) ────────────
  const storeComplete = !!(store_name && store_name.trim());
  const businessComplete = !!(business_name && business_name.trim()
    && pan_number && pan_number.trim()
    && gst_number && gstinRegex.test(gst_number.trim().toUpperCase()));
  const emailVerified = !!(vendor && vendor.business_email_verified);
  const pickupComplete = !!(pickup_name && pickup_name.trim() && pickup_phone && pickup_phone.trim()
    && pickup_line1 && pickup_line1.trim() && pickup_city && pickup_city.trim()
    && pickup_state && pickup_state.trim() && pickup_pincode && /^\d{6}$/.test(pickup_pincode.trim()));
  const bankComplete = !!(bank_name && bank_name.trim() && account_number && account_number.trim()
    && ifsc_code && ifsc_code.trim() && account_holder && account_holder.trim());

  const REQUIRED_DOCS = ['gst_certificate', 'pan_image', 'aadhar_image_front', 'aadhar_image_back', 'passport_photo', 'cancelled_cheque'];
  const missingDocs = REQUIRED_DOCS.filter((d) => !(files[d]?.[0] || (vendor && vendor[d])));

  if (!storeComplete || !businessComplete || !emailVerified || !pickupComplete || !bankComplete || missingDocs.length) {
    const missing = [];
    if (!storeComplete) missing.push('store name');
    if (!businessComplete) missing.push('business details (business name, PAN, valid GSTIN)');
    if (!emailVerified) missing.push('business email verification');
    if (!bankComplete) missing.push('bank details');
    if (!pickupComplete) missing.push('pickup address details (contact name, phone, address, city, state, pincode)');
    if (missingDocs.length) missing.push(`required documents (${missingDocs.join(', ')})`);
    return sendError(res, `Please complete all required fields before submitting: ${missing.join(', ')}`, 400);
  }

  const targetEmail = business_email || vendor?.business_email;
  if (!targetEmail) {
    return sendError(res, 'Business email is required', 400);
  }

  // Create the vendor record now that the application is complete (new rows default to 'draft')
  let record = vendor;
  if (!record) {
    await query('INSERT INTO vendors (id, user_id, business_name) VALUES (UUID(), ?, ?)', [req.user.id, business_name || '']);
    record = await queryOne('SELECT * FROM vendors WHERE user_id = ?', [req.user.id]);
  }

  const updates = {
    gst_number: gst_number?.toUpperCase(),
    fssai_number: fssai_number?.toUpperCase(),
    pan_number: pan_number?.toUpperCase(),
    business_name, business_type,
    business_email: targetEmail,
    store_name, store_description,
    bank_name,
    account_number: account_number?.toUpperCase(),
    ifsc_code: ifsc_code?.toUpperCase(),
    account_holder,
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
  const params = [...Object.values(updates).map(v => v ?? null), record.id];
  await query(`UPDATE vendors SET ${fields} WHERE id = ?`, params);

  sendSuccess(res, null, 'KYC submitted for review');
});

/** GET /vendors/kyc/:filename — serve decrypted KYC file */
const getKYCDocument = asyncHandler(async (req, res) => {
  const { decrypt } = require('../utils/encryption.util');
  const filePath = path.join(process.cwd(), config.get('app.uploadDir'), 'kyc', req.params.filename);
  if (!fs.existsSync(filePath)) return sendError(res, 'File not found', 404);
  const encrypted = fs.readFileSync(filePath);
  const decrypted = decrypt(encrypted);
  const ext = path.extname(req.params.filename).toLowerCase();
  const mime = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  res.status(200);
  res.set('Content-Type', mime);
  res.set('Content-Length', decrypted.length);
  res.set('Content-Disposition', `inline; filename="${req.params.filename}"`);
  res.set('Cache-Control', 'no-store');
  res.end(decrypted);
});

// ─── Dashboard / analytics ────────────────────────────────────────────────────

/** GET /vendors/dashboard */
const getDashboard = asyncHandler(async (req, res) => {
  const vendorId = req.vendor.id;

  const [stats, recentOrders, lowStock, monthlyRevenue, orderStatus] = await Promise.all([
    queryOne(
      `SELECT
        (SELECT COUNT(*) FROM products WHERE vendor_id = ? AND deleted_at IS NULL) as total_products,
        (SELECT COUNT(*) FROM order_items WHERE vendor_id = ?) as total_orders,
        (SELECT COUNT(DISTINCT order_id) FROM order_items WHERE vendor_id = ?) as total_unique_orders,
        (SELECT SUM(total_price) FROM order_items WHERE vendor_id = ? AND status = 'delivered') as total_revenue,
        (SELECT COUNT(*) FROM order_items WHERE vendor_id = ? AND status IN ('placed','confirmed','processing')) as active_orders,
        (SELECT COALESCE(rating, 0) FROM vendors WHERE id = ?) as rating,
        (SELECT COUNT(*) FROM order_items WHERE vendor_id = ? AND status = 'placed') as placed_orders,
        (SELECT COUNT(*) FROM order_items WHERE vendor_id = ? AND status = 'processing') as processing_orders,
        (SELECT COUNT(*) FROM order_items WHERE vendor_id = ? AND status = 'shipped') as shipped_orders,
        (SELECT COUNT(*) FROM order_items WHERE vendor_id = ? AND status = 'delivered') as delivered_orders,
        (SELECT COUNT(*) FROM order_items WHERE vendor_id = ? AND status = 'cancelled') as cancelled_orders`,
      Array(11).fill(vendorId)
    ),
    queryRows(
      `SELECT oi.id, oi.product_id, oi.product_name, oi.quantity, oi.total_price, oi.status, o.order_number, o.created_at,
        u.name as customer_name, u.email as customer_email,
        (SELECT url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1) as product_image
       FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN users u ON o.user_id = u.id
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
    queryOne(
      `SELECT
        SUM(status = 'placed') as placed, SUM(status = 'processing') as processing,
        SUM(status = 'shipped') as shipped, SUM(status = 'delivered') as delivered,
        SUM(status = 'cancelled') as cancelled
       FROM order_items WHERE vendor_id = ?`, [vendorId]
    ),
  ]);

  // Order status breakdown for the donut chart
  const order_status_breakdown = orderStatus
    ? [
        { name: 'Placed', value: orderStatus.placed || 0 },
        { name: 'Processing', value: orderStatus.processing || 0 },
        { name: 'Shipped', value: orderStatus.shipped || 0 },
        { name: 'Delivered', value: orderStatus.delivered || 0 },
        { name: 'Cancelled', value: orderStatus.cancelled || 0 },
      ].filter((d) => d.value > 0)
    : [];

  sendSuccess(res, {
    stats,
    recent_orders: recentOrders,
    recentOrders,
    low_stock_products: lowStock,
    lowStockProducts: lowStock,
    monthly_revenue: monthlyRevenue,
    monthlyRevenue,
    order_status_breakdown,
    orderStatusBreakdown: order_status_breakdown,
  });
});

/** GET /vendors/products */
const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getVendorProducts(req.vendor.id, req.query);
  sendPaginated(res, { ...result, message: 'Products fetched' });
});

/** GET /vendors/orders */
const getOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getVendorOrders(req.vendor.id, req.query);
  sendPaginated(res, { ...result, message: 'Orders fetched' });
});

/** GET /vendors/payouts */
const getPayouts = asyncHandler(async (req, res) => {
  const payouts = await queryRows(
    'SELECT * FROM vendor_payouts WHERE vendor_id = ? ORDER BY created_at DESC',
    [req.vendor.id]
  );
  const payoutService = require('../services/payout.service');
  const pendingAmount = await payoutService.getVendorPendingAmount(req.vendor.id);
  sendSuccess(res, { payouts, pendingAmount });
});

/** GET /vendors/analytics */
const getAnalytics = asyncHandler(async (req, res) => {
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
});

/** GET /vendors/notifications */
const getNotifications = asyncHandler(async (req, res) => {
  const notifs = await queryRows(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [req.user.id]
  );
  sendSuccess(res, notifs);
});

// ─── Public vendor store ──────────────────────────────────────────────────────

/** GET /vendors/:vendorId/store */
const getStore = asyncHandler(async (req, res) => {
  const vendor = await queryOne(
    `SELECT v.id, v.store_name, v.store_logo, v.store_banner, v.store_description, v.rating, v.total_reviews, v.total_sales, v.created_at
     FROM vendors v WHERE v.id = ? AND v.is_active = 1 AND v.kyc_status = 'approved'`,
    [req.params.vendorId]
  );
  if (!vendor) return sendError(res, 'Store not found', 404);

  const { cursor, limit } = getCursorPagination(req.query, 12);
  const effectiveLimit = parseInt(limit) || 12;

  const where = "p.vendor_id = ? AND p.status = 'active' AND p.deleted_at IS NULL";
  const baseParams = [vendor.id];

  // Keyset predicate (order by is_featured DESC, created_at DESC; tie-break by id)
  let keyset = '';
  const keysetParams = [];
  if (cursor) {
    keyset = ` AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))`;
    keysetParams.push(cursor.value, cursor.value, cursor.id);
  }

  const products = await queryRows(
    `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.rating, p.total_reviews, p.stock, p.is_featured, p.sale_count,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
     FROM products p
     WHERE ${where}${keyset}
     ORDER BY p.is_featured DESC, p.created_at DESC, p.id DESC
     LIMIT ?`,
    [...baseParams, ...keysetParams, effectiveLimit + 1]
  );

  const hasMore = products.length > effectiveLimit;
  if (hasMore) products.pop();

  const [countRow] = await queryRows(
    `SELECT COUNT(*) as total FROM products WHERE vendor_id = ? AND status = 'active' AND deleted_at IS NULL`,
    [vendor.id]
  );

  const last = products[products.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.created_at, last.id) : null;

  sendSuccess(res, { ...vendor, products, totalProducts: countRow?.total || 0, limit: effectiveLimit, nextCursor, hasMore });
});

module.exports = {
  getProfile,
  updateProfile,
  updateBranding,
  createPendingUpdate,
  getPendingUpdates,
  cancelPendingUpdate,
  createPendingDocuments,
  sendBusinessOTP,
  verifyBusinessOTP,
  submitKYC,
  getKYC,
  getKYCDocument,
  getDashboard,
  getProducts,
  getOrders,
  getPayouts,
  getAnalytics,
  getNotifications,
  getStore,
};

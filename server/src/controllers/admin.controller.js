/**
 * Damini Marketplace - Admin Controller
 */

const path = require('path');
const fs = require('fs');
const config = require('config');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendPaginated, sendError } = require('../utils/response.util');
const { query, queryOne, queryRows } = require('../database/connection');
const { getPagination } = require('../utils/pagination.util');
const { clearShippingCache } = require('../utils/shipping.util');
const notificationService = require('../services/notification.service');
const emailService = require('../services/email.service');
const shipmentService = require('../services/shipment.service');
const logger = require('../utils/logger.util');

const KYC_DOC_FIELDS = [
  'gst_certificate', 'pan_image', 'aadhar_image_front', 'aadhar_image_back',
  'passport_photo', 'udyam_certificate', 'bank_passbook', 'cancelled_cheque',
];

const PENDING_UPDATE_COLUMNS = [
  'business_name', 'business_type', 'business_email', 'gst_number', 'fssai_number', 'pan_number',
  'bank_name', 'account_number', 'ifsc_code', 'account_holder',
  'pickup_name', 'pickup_phone', 'pickup_line1', 'pickup_line2', 'pickup_city', 'pickup_state', 'pickup_pincode',
  'gst_certificate', 'pan_image', 'aadhar_image_front', 'aadhar_image_back',
  'passport_photo', 'udyam_certificate', 'bank_passbook', 'cancelled_cheque',
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

/** GET /admin/dashboard */
const getDashboard = asyncHandler(async (req, res) => {
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
});

/** GET /admin/dashboard/pending-counts — sidebar badges */
const getPendingCounts = asyncHandler(async (req, res) => {
  const [[vendorCounts]] = await query("SELECT COUNT(*) as pending_vendors FROM vendors WHERE kyc_status = 'pending'");
  const [[productCounts]] = await query("SELECT COUNT(*) as pending_products FROM products WHERE status = 'pending' AND deleted_at IS NULL");
  const [[returnCounts]] = await query("SELECT COUNT(*) as pending_returns FROM returns WHERE status IN ('requested','under_review')");
  sendSuccess(res, {
    pending_vendors: vendorCounts.pending_vendors || 0,
    pending_products: productCounts.pending_products || 0,
    pending_returns: returnCounts.pending_returns || 0,
    total_pending: (vendorCounts.pending_vendors || 0) + (productCounts.pending_products || 0) + (returnCounts.pending_returns || 0),
  });
});

// ─── Vendor Management ────────────────────────────────────────────────────────

/** GET /admin/vendors */
const listVendors = asyncHandler(async (req, res) => {
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
});

/** GET /admin/vendors/pending-updates?status=pending&vendor_id= */
const listVendorPendingUpdates = asyncHandler(async (req, res) => {
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
});

/** GET /admin/vendors/:id */
const getVendorById = asyncHandler(async (req, res) => {
  const vendor = await queryOne(
    'SELECT v.*, u.name as owner_name, u.email, u.phone, u.role as user_role, u.is_active as user_active, u.is_verified as user_verified FROM vendors v JOIN users u ON v.user_id = u.id WHERE v.id = ?',
    [req.params.id]
  );
  sendSuccess(res, vendor);
});

/** GET /admin/vendors/:id/documents/:filename — serve decrypted KYC document */
const getVendorDocument = asyncHandler(async (req, res) => {
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
  res.status(200);
  res.set('Content-Type', mime);
  res.set('Content-Length', decrypted.length);
  res.set('Content-Disposition', `inline; filename="${req.params.filename}"`);
  res.set('Cache-Control', 'no-store');
  res.end(decrypted);
});

/** PATCH /admin/vendors/:id/approve */
const approveVendor = asyncHandler(async (req, res) => {
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

  await query("UPDATE vendors SET kyc_status = 'approved', gst_rate = COALESCE(gst_rate, 18.00) WHERE id = ?", [req.params.id]);
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

  // Automatically register this vendor's Shiprocket pickup location (idempotent,
  // no manual Shiprocket dashboard configuration required). Runs in the
  // background so approval is not blocked by the external API; on failure the
  // vendor is marked 'Pickup Registration Failed' and can be retried by admin.
  (async () => {
    try {
      await shipmentService.registerVendorPickup(req.params.id);
    } catch (err) {
      logger.warn(`[Admin] Auto pickup registration skipped for vendor ${req.params.id}: ${err.message}`);
    }
  })();

  sendSuccess(res, null, 'Vendor approved');
});

/** PATCH /admin/vendors/:id/reject */
const rejectVendor = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  await query("UPDATE vendors SET kyc_status = 'rejected', kyc_rejected_reason = ? WHERE id = ?", [reason, req.params.id]);
  sendSuccess(res, null, 'Vendor rejected');
});

/** PATCH /admin/vendors/:id/suspend */
const suspendVendor = asyncHandler(async (req, res) => {
  await query('UPDATE vendors SET is_active = 0 WHERE id = ?', [req.params.id]);
  await query("UPDATE users SET is_active = 0 WHERE id = (SELECT user_id FROM vendors WHERE id = ?)", [req.params.id]);
  sendSuccess(res, null, 'Vendor suspended');
});

/** PATCH /admin/vendors/:id/unsuspend */
const unsuspendVendor = asyncHandler(async (req, res) => {
  await query('UPDATE vendors SET is_active = 1 WHERE id = ?', [req.params.id]);
  await query("UPDATE users SET is_active = 1 WHERE id = (SELECT user_id FROM vendors WHERE id = ?)", [req.params.id]);
  sendSuccess(res, null, 'Vendor reinstated');
});

/** PATCH /admin/vendors/:id/commission — set a vendor's commission rate (%) or clear to use the platform default */
const updateVendorCommission = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE id = ?', [req.params.id]);
  if (!vendor) return sendError(res, 'Vendor not found', 404);

  const value = req.body.commission_rate;
  if (value === null || value === undefined || value === '') {
    await query('UPDATE vendors SET commission_rate = NULL WHERE id = ?', [req.params.id]);
    return sendSuccess(res, null, 'Vendor commission reset to platform default');
  }

  const rate = Number(value);
  if (Number.isNaN(rate) || rate < 0 || rate > 100) {
    return sendError(res, 'Commission rate must be between 0 and 100', 400);
  }

  await query('UPDATE vendors SET commission_rate = ? WHERE id = ?', [rate, req.params.id]);
  sendSuccess(res, null, 'Vendor commission rate updated');
});

/** GET /admin/vendors/:id/pickup — current Shiprocket pickup status for a vendor */
const getVendorPickupStatus = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE id = ?', [req.params.id]);
  if (!vendor) return sendError(res, 'Vendor not found', 404);
  const status = await shipmentService.getVendorPickupStatus(vendor.id);
  sendSuccess(res, status);
});

/** POST /admin/vendors/:id/pickup/retry — re-attempt Shiprocket pickup registration (idempotent) */
const retryVendorPickup = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE id = ?', [req.params.id]);
  if (!vendor) return sendError(res, 'Vendor not found', 404);
  const status = await shipmentService.registerVendorPickup(vendor.id, { force: false });
  const ok = status.status === 'registered';
  sendSuccess(res, status, ok ? 'Pickup registered successfully' : 'Pickup registration attempt completed; check status');
});

/** POST /admin/vendors/:id/pickup/re-register — force a fresh Shiprocket pickup location */
const forceReregisterVendorPickup = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE id = ?', [req.params.id]);
  if (!vendor) return sendError(res, 'Vendor not found', 404);
  const status = await shipmentService.registerVendorPickup(vendor.id, { force: true });
  const ok = status.status === 'registered';
  sendSuccess(res, status, ok ? 'Pickup re-registered successfully' : 'Pickup re-registration attempt completed; check status');
});

// ─── Vendor Pending Updates (approval workflow) ───────────────────────────────

/** POST /admin/vendors/pending-updates/:id/approve */
const approveVendorPendingUpdate = asyncHandler(async (req, res) => {
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

  // If the approved update changed any pickup-address field, re-evaluate the
  // vendor's Shiprocket pickup mapping. registerVendorPickup is idempotent: it
  // preserves the existing mapping when the address is unchanged, and only
  // registers a new Shiprocket pickup when the address genuinely changed.
  // Runs in the background so approval is not blocked by the external API.
  const pickupFields = ['pickup_name', 'pickup_phone', 'pickup_line1', 'pickup_line2', 'pickup_city', 'pickup_state', 'pickup_pincode'];
  if (Object.keys(valid).some((k) => pickupFields.includes(k))) {
    (async () => {
      try {
        await shipmentService.registerVendorPickup(pending.vendor_id);
      } catch (err) {
        logger.warn(`[Admin] Pickup re-registration skipped for vendor ${pending.vendor_id}: ${err.message}`);
      }
    })();
  }

  sendSuccess(res, null, 'Update approved and applied');
});

/** POST /admin/vendors/pending-updates/:id/reject */
const rejectVendorPendingUpdate = asyncHandler(async (req, res) => {
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
});

// ─── User Management ──────────────────────────────────────────────────────────

/** GET /admin/users */
const listUsers = asyncHandler(async (req, res) => {
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
});

/** PATCH /admin/users/:id/ban */
const banUser = asyncHandler(async (req, res) => {
  await query('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
  sendSuccess(res, null, 'User banned');
});

/** PATCH /admin/users/:id/unban */
const unbanUser = asyncHandler(async (req, res) => {
  await query('UPDATE users SET is_active = 1 WHERE id = ?', [req.params.id]);
  sendSuccess(res, null, 'User unbanned');
});

// ─── Product Management ───────────────────────────────────────────────────────

/** GET /admin/products */
const listProducts = asyncHandler(async (req, res) => {
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
});

// ─── Payouts ──────────────────────────────────────────────────────────────────

/** GET /admin/payouts */
const listPayouts = asyncHandler(async (req, res) => {
  const payouts = await queryRows(
    `SELECT vp.*, v.store_name, u.name as owner_name, u.email
     FROM vendor_payouts vp JOIN vendors v ON vp.vendor_id = v.id JOIN users u ON v.user_id = u.id
     ORDER BY vp.created_at DESC LIMIT 100`
  );
  sendSuccess(res, payouts);
});

/** POST /admin/payouts/release */
const releasePayout = asyncHandler(async (req, res) => {
  const { vendorId, orderIds, amount, transactionRef } = req.body;

  if (!vendorId) return sendError(res, 'vendorId is required', 400);
  const vendorCheck = await queryOne(
    'SELECT v.store_name, v.bank_name, v.ifsc_code, v.account_number, v.user_id FROM vendors v WHERE v.id = ?',
    [vendorId]
  );
  if (!vendorCheck) return sendError(res, 'Vendor not found', 404);
  if (!vendorCheck.bank_name || !vendorCheck.ifsc_code || !vendorCheck.account_number) {
    return sendError(res, 'Vendor has no settlement bank details on file', 400);
  }

  if (!transactionRef || !String(transactionRef).trim()) {
    return sendError(res, 'Bank transaction reference / UTR is required', 400);
  }

  const requestedAmount = parseFloat(amount);
  if (Number.isNaN(requestedAmount) || requestedAmount <= 0) {
    return sendError(res, 'Invalid payout amount', 400);
  }

  const payoutService = require('../services/payout.service');
  const { raw, byVendor, minPayout } = await payoutService.getEligibleOrders(vendorId, true);
  const entry = byVendor.find((e) => e.vendor_id === vendorId);

  if (!entry || entry.payable <= 0) {
    return sendError(res, 'No eligible (delivered, return-window-elapsed) pending amount for this vendor', 400);
  }

  // Map of eligible order_id -> its payable amount, for precise subset handling.
  const orderAmountMap = new Map();
  raw.forEach((r) => {
    if (r.vendor_id === vendorId) orderAmountMap.set(r.order_id, (orderAmountMap.get(r.order_id) || 0) + Number(r.vendor_payout || 0));
  });
  const allEligibleOrderIds = entry.orderIds;

  let selectedOrderIds;
  let eligibleSum;

  if (Array.isArray(orderIds) && orderIds.length > 0) {
    const cleaned = orderIds.map((s) => String(s).trim()).filter(Boolean);
    const unique = [...new Set(cleaned)];
    // Keep only order IDs that are eligible (not already settled / payable).
    selectedOrderIds = unique.filter((id) => orderAmountMap.has(id));
    if (selectedOrderIds.length === 0) {
      return sendError(res, 'None of the provided order IDs are eligible for settlement (already settled or not yet payable)', 400);
    }
    eligibleSum = selectedOrderIds.reduce((s, id) => s + orderAmountMap.get(id), 0);
  } else {
    selectedOrderIds = allEligibleOrderIds;
    eligibleSum = entry.payable;
  }

  if (requestedAmount > eligibleSum) {
    return sendError(
      res,
      `Requested amount (₹${requestedAmount.toFixed(2)}) exceeds eligible amount for the chosen orders (₹${eligibleSum.toFixed(2)})`,
      400
    );
  }

  // Enforce the minimum payout threshold on the amount being released.
  if (minPayout > 0 && requestedAmount < minPayout) {
    return sendError(
      res,
      `Released amount (₹${requestedAmount.toFixed(2)}) is below the minimum payout of ₹${minPayout.toFixed(2)}`,
      400
    );
  }

  // The actual settled order IDs are the eligible subset selected (or all if none given).
  const settledOrderIds = selectedOrderIds;
  const settledAmount = eligibleSum;

  await query(
    'INSERT INTO vendor_payouts (vendor_id, amount, order_ids, status, transaction_ref, initiated_at, completed_at) VALUES (?, ?, ?, "completed", ?, NOW(), NOW())',
    [vendorId, settledAmount, JSON.stringify(settledOrderIds), String(transactionRef).trim()]
  );

  if (vendorCheck.user_id) {
    try {
      await notificationService.createNotification(vendorCheck.user_id, {
        title: 'Payout Released',
        message: `Your payout of ₹${settledAmount.toFixed(2)} has been released. It will reflect in your bank account within 1-2 business days.`,
        type: 'payment',
        referenceId: null,
        referenceType: 'payout',
      });
    } catch (e) {}
    if (vendorCheck.store_name) {
      (async () => {
        try {
          const owner = await queryOne(
            'SELECT u.name, u.email FROM vendors v JOIN users u ON v.user_id = u.id WHERE v.id = ?',
            [vendorId]
          );
          if (owner && owner.email) {
            await emailService.sendPayoutReleasedEmail(owner.email, owner.name, settledAmount);
          }
        } catch (e) {}
      })();
    }
  }
  sendCreated(res, { vendor_id: vendorId, amount: settledAmount, order_count: settledOrderIds.length }, 'Payout released');
});

/** POST /admin/payouts/run-cycle — manually trigger the automated settlement cycle */
const runPayoutCycle = asyncHandler(async (req, res) => {
  const payoutService = require('../services/payout.service');
  const result = await payoutService.runSettlementCycle();
  sendSuccess(res, result, 'Settlement cycle completed');
});

/** GET /admin/payouts/preview — preview eligible vendors BEFORE any payout is created */
const previewPayoutCycle = asyncHandler(async (req, res) => {
  const payoutService = require('../services/payout.service');
  const result = await payoutService.previewSettlementCycle();
  sendSuccess(res, result);
});

/** POST /admin/payouts/settle-vendor — settle a single vendor one-by-one */
const settleOneVendor = asyncHandler(async (req, res) => {
  const { vendorId } = req.body || {};
  if (!vendorId) return sendError(res, 'vendorId is required', 400);
  const payoutService = require('../services/payout.service');
  const result = await payoutService.settleVendor(vendorId);
  sendCreated(res, result, 'Vendor payout released');
});

// ─── Platform Settings ────────────────────────────────────────────────────────

/** GET /admin/settings */
const getSettings = asyncHandler(async (req, res) => {
  const settings = await queryRows('SELECT * FROM platform_settings');
  const obj = {};
  settings.forEach(s => { obj[s.key] = s.value; });
  sendSuccess(res, obj);
});

/** PUT /admin/settings */
const updateSettings = asyncHandler(async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await query(
      'INSERT INTO platform_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [key, String(value), String(value)]
    );
  }
  clearShippingCache();
  sendSuccess(res, null, 'Settings updated');
});

// ─── Disputes ─────────────────────────────────────────────────────────────────

/** GET /admin/disputes */
const listDisputes = asyncHandler(async (req, res) => {
  const disputes = await queryRows(
    `SELECT d.*, u.name as customer_name, u.email, o.order_number
     FROM disputes d JOIN users u ON d.user_id = u.id JOIN orders o ON d.order_id = o.id
     ORDER BY d.created_at DESC LIMIT 100`
  );
  sendSuccess(res, disputes);
});

/** PATCH /admin/disputes/:id/resolve */
const resolveDispute = asyncHandler(async (req, res) => {
  const { resolution } = req.body;
  await query(
    "UPDATE disputes SET status = 'resolved', resolution = ?, resolved_by = ?, resolved_at = NOW() WHERE id = ?",
    [resolution, req.user.id, req.params.id]
  );
  sendSuccess(res, null, 'Dispute resolved');
});

// ─── Festival Sales ───────────────────────────────────────────────────────────

/** GET /admin/festival-sales */
const listFestivalSales = asyncHandler(async (req, res) => {
  const sales = await queryRows('SELECT * FROM festival_sales ORDER BY starts_at DESC');
  sendSuccess(res, sales);
});

/** POST /admin/festival-sales */
const createFestivalSale = asyncHandler(async (req, res) => {
  const { name, description, banner, starts_at, ends_at } = req.body;
  await query('INSERT INTO festival_sales (name, description, banner, starts_at, ends_at) VALUES (?, ?, ?, ?, ?)',
    [name, description || null, banner || null, starts_at, ends_at]);
  sendCreated(res, null, 'Festival sale created');
});

/** PUT /admin/festival-sales/:id */
const updateFestivalSale = asyncHandler(async (req, res) => {
  const { name, description, banner, starts_at, ends_at, is_active } = req.body;
  await query(
    'UPDATE festival_sales SET name=?, description=?, banner=?, starts_at=?, ends_at=?, is_active=? WHERE id=?',
    [name, description || null, banner || null, starts_at, ends_at, is_active ?? 1, req.params.id]
  );
  sendSuccess(res, null, 'Festival sale updated');
});

/** DELETE /admin/festival-sales/:id */
const deleteFestivalSale = asyncHandler(async (req, res) => {
  await query('DELETE FROM festival_sales WHERE id = ?', [req.params.id]);
  sendSuccess(res, null, 'Festival sale deleted');
});

// ─── Reports ──────────────────────────────────────────────────────────────────

/** GET /admin/reports/sales */
const getSalesReport = asyncHandler(async (req, res) => {
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
});

/** GET /admin/reports/vendors */
const getVendorsReport = asyncHandler(async (req, res) => {
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
});

module.exports = {
  getDashboard,
  getPendingCounts,
  listVendors,
  listVendorPendingUpdates,
  getVendorById,
  getVendorDocument,
  approveVendor,
  rejectVendor,
  suspendVendor,
  unsuspendVendor,
  updateVendorCommission,
  getVendorPickupStatus,
  retryVendorPickup,
  forceReregisterVendorPickup,
  approveVendorPendingUpdate,
  rejectVendorPendingUpdate,
  listUsers,
  banUser,
  unbanUser,
  listProducts,
  listPayouts,
  releasePayout,
  runPayoutCycle,
  previewPayoutCycle,
  settleOneVendor,
  getSettings,
  updateSettings,
  listDisputes,
  resolveDispute,
  listFestivalSales,
  createFestivalSale,
  updateFestivalSale,
  deleteFestivalSale,
  getSalesReport,
  getVendorsReport,
};

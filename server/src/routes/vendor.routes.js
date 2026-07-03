/**
 * Damini Marketplace - Vendor Routes (complete)
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { attachVendor } = require('../middlewares/vendor.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response.util');
const { query, queryOne, queryRows } = require('../database/connection');
const { uploadKYC } = require('../middlewares/upload.middleware');
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
    [store_name, store_description, req.vendor.id]
  );
  sendSuccess(res, null, 'Profile updated');
}));

/** POST /vendors/kyc */
router.post('/kyc', ...vendorProtect, uploadKYC, asyncHandler(async (req, res) => {
  const { gst_number, pan_number, business_name, business_type, bank_name, account_number, ifsc_code, account_holder,
    pickup_name, pickup_phone, pickup_line1, pickup_city, pickup_state, pickup_pincode } = req.body;

  const files = req.files || {};
  const getUrl = (field) => files[field]?.[0] ? `/uploads/kyc/${files[field][0].filename}` : null;

  const updates = {
    gst_number, pan_number, business_name, business_type,
    bank_name, account_number, ifsc_code, account_holder,
    pickup_name, pickup_phone, pickup_line1, pickup_city, pickup_state, pickup_pincode,
    kyc_status: 'submitted',
  };
  if (getUrl('gst_certificate')) updates.gst_certificate = getUrl('gst_certificate');
  if (getUrl('pan_image')) updates.pan_image = getUrl('pan_image');
  if (getUrl('aadhar_image')) updates.aadhar_image = getUrl('aadhar_image');
  if (getUrl('cancelled_cheque')) updates.cancelled_cheque = getUrl('cancelled_cheque');

  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const params = [...Object.values(updates), req.vendor.id];
  await query(`UPDATE vendors SET ${fields} WHERE id = ?`, params);

  sendSuccess(res, null, 'KYC submitted for review');
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
  sendSuccess(res, vendor);
}));

module.exports = router;

/**
 * Damini Marketplace - Order Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { attachVendor } = require('../middlewares/vendor.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response.util');
const orderService = require('../services/order.service');

const router = express.Router();

// ─── Customer routes ──────────────────────────────────────────────────────────
router.post('/', protect, asyncHandler(async (req, res) => {
  const result = await orderService.createOrder(req.user.id, req.body);
  sendCreated(res, result, 'Order placed successfully');
}));

router.get('/', protect, asyncHandler(async (req, res) => {
  const result = await orderService.getUserOrders(req.user.id, req.query);
  sendPaginated(res, { ...result, message: 'Orders fetched' });
}));

router.get('/my/:orderId', protect, asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.orderId, req.user.id, 'customer');
  sendSuccess(res, order);
}));

router.delete('/:orderId/cancel', protect, asyncHandler(async (req, res) => {
  await orderService.cancelOrder(req.params.orderId, req.user.id, req.body.reason);
  sendSuccess(res, null, 'Order cancelled successfully');
}));

// ─── Vendor routes ────────────────────────────────────────────────────────────
router.get('/vendor', protect, requireRole('vendor'), attachVendor, asyncHandler(async (req, res) => {
  const result = await orderService.getVendorOrders(req.vendor.id, req.query);
  sendPaginated(res, { ...result, message: 'Vendor orders fetched' });
}));

router.patch('/vendor/:orderId/confirm', protect, requireRole('vendor'), attachVendor, asyncHandler(async (req, res) => {
  const { query } = require('../database/connection');
  await query("UPDATE order_items SET status = 'processing' WHERE order_id = ? AND vendor_id = ?", [req.params.orderId, req.vendor.id]);
  await query("UPDATE orders SET status = 'processing' WHERE id = ?", [req.params.orderId]);
  sendSuccess(res, null, 'Order confirmed');
}));

router.patch('/vendor/:orderId/ship', protect, requireRole('vendor'), attachVendor, asyncHandler(async (req, res) => {
  const { query } = require('../database/connection');
  const { trackingId, courierName } = req.body;
  await query("UPDATE order_items SET status = 'shipped' WHERE order_id = ? AND vendor_id = ?", [req.params.orderId, req.vendor.id]);
  await query("UPDATE orders SET status = 'shipped' WHERE id = ?", [req.params.orderId]);
  if (trackingId) {
    await query(
      'INSERT INTO shipments (order_id, vendor_id, awb_code, courier_name, status) VALUES (?, ?, ?, ?, "shipped") ON DUPLICATE KEY UPDATE awb_code = ?, courier_name = ?, status = "shipped"',
      [req.params.orderId, req.vendor.id, trackingId, courierName || null, trackingId, courierName || null]
    );
  }
  sendSuccess(res, null, 'Order marked as shipped');
}));

router.patch('/vendor/:orderId/deliver', protect, requireRole('vendor'), attachVendor, asyncHandler(async (req, res) => {
  const { query } = require('../database/connection');
  await query("UPDATE order_items SET status = 'delivered' WHERE order_id = ? AND vendor_id = ?", [req.params.orderId, req.vendor.id]);
  await query("UPDATE orders SET status = 'delivered', delivered_at = NOW() WHERE id = ?", [req.params.orderId]);
  sendSuccess(res, null, 'Order marked as delivered');
}));

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get('/admin', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await orderService.getAllOrders(req.query);
  sendPaginated(res, { ...result, message: 'All orders fetched' });
}));

router.get('/admin/stats', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  const stats = await orderService.getOrderStats();
  sendSuccess(res, stats);
}));

router.get('/admin/:orderId', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.orderId, null, 'admin');
  sendSuccess(res, order);
}));

router.patch('/admin/:orderId/status', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await orderService.updateOrderStatus(req.params.orderId, req.body.status);
  sendSuccess(res, null, 'Order status updated');
}));

module.exports = router;

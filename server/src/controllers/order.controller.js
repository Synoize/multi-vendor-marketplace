/**
 * Damini Marketplace - Order Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response.util');
const { query } = require('../database/connection');
const orderService = require('../services/order.service');
const { processDeliveryRewards } = require('../services/referral.service');

// ─── Customer ─────────────────────────────────────────────────────────────────

/** POST /orders */
const createOrder = asyncHandler(async (req, res) => {
  const result = await orderService.createOrder(req.user.id, req.body);
  sendCreated(res, result, 'Order placed successfully');
});

/** GET /orders */
const getUserOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getUserOrders(req.user.id, req.query);
  sendPaginated(res, { ...result, message: 'Orders fetched' });
});

/** GET /orders/my/:orderId */
const getMyOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.orderId, req.user.id, 'customer');
  sendSuccess(res, order);
});

/** DELETE /orders/:orderId/cancel */
const cancelOrder = asyncHandler(async (req, res) => {
  await orderService.cancelOrder(req.params.orderId, req.user.id, req.body.reason);
  sendSuccess(res, null, 'Order cancelled successfully');
});

// ─── Vendor ───────────────────────────────────────────────────────────────────

/** GET /orders/vendor */
const getVendorOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getVendorOrders(req.vendor.id, req.query);
  sendPaginated(res, { ...result, message: 'Vendor orders fetched' });
});

/** PATCH /orders/vendor/:orderId/confirm */
const confirmVendorOrder = asyncHandler(async (req, res) => {
  await query("UPDATE order_items SET status = 'processing' WHERE order_id = ? AND vendor_id = ?", [req.params.orderId, req.vendor.id]);
  await query("UPDATE orders SET status = 'processing' WHERE id = ?", [req.params.orderId]);
  sendSuccess(res, null, 'Order confirmed');
});

/** PATCH /orders/vendor/:orderId/ship */
const shipVendorOrder = asyncHandler(async (req, res) => {
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
});

/** PATCH /orders/vendor/:orderId/deliver */
const deliverVendorOrder = asyncHandler(async (req, res) => {
  await query("UPDATE order_items SET status = 'delivered' WHERE order_id = ? AND vendor_id = ?", [req.params.orderId, req.vendor.id]);
  await query("UPDATE orders SET status = 'delivered', delivered_at = NOW() WHERE id = ?", [req.params.orderId]);
  // Fire-and-forget: process referral + first-purchase coin rewards
  processDeliveryRewards(req.params.orderId).catch(() => {});
  sendSuccess(res, null, 'Order marked as delivered');
});

// ─── Admin ────────────────────────────────────────────────────────────────────

/** GET /orders/admin */
const getAllOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getAllOrders(req.query);
  sendPaginated(res, { ...result, message: 'All orders fetched' });
});

/** GET /orders/admin/stats */
const getOrderStats = asyncHandler(async (req, res) => {
  const stats = await orderService.getOrderStats();
  sendSuccess(res, stats);
});

/** GET /orders/admin/:orderId */
const getAdminOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.orderId, null, 'admin');
  sendSuccess(res, order);
});

/** PATCH /orders/admin/:orderId/status */
const updateOrderStatus = asyncHandler(async (req, res) => {
  await orderService.updateOrderStatus(req.params.orderId, req.body.status);
  sendSuccess(res, null, 'Order status updated');
});

module.exports = {
  createOrder,
  getUserOrders,
  getMyOrder,
  cancelOrder,
  getVendorOrders,
  confirmVendorOrder,
  shipVendorOrder,
  deliverVendorOrder,
  getAllOrders,
  getOrderStats,
  getAdminOrder,
  updateOrderStatus,
};

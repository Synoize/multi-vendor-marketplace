/**
 * Damini Marketplace - Order Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response.util');
const { query, queryOne, queryRows } = require('../database/connection');
const logger = require('../utils/logger.util');
const orderService = require('../services/order.service');
const shipmentService = require('../services/shipment.service');
const { processDeliveryRewards } = require('../services/referral.service');
const emailService = require('../services/email.service');

/**
 * Live-sync all active Shiprocket shipments for an order so the returned
 * status reflects the real courier state. Safe no-op when none exist.
 */
async function syncOrderShipments(orderId) {
  const active = await queryRows(
    `SELECT * FROM shipments WHERE order_id = ? AND awb_code IS NOT NULL
     AND status IN ('processing','ready_to_ship','shipped','in_transit','out_for_delivery','rto_initiated')`,
    [orderId]
  );
  for (const s of active) {
    try {
      await shipmentService.syncShipment(s.id);
    } catch (err) {
      logger.warn(`[Order] Live sync skipped for shipment ${s.id}: ${err.message}`);
    }
  }
}

// ─── Customer ─────────────────────────────────────────────────────────────────

/** POST /orders */
const createOrder = asyncHandler(async (req, res) => {
  // Support a client-supplied Idempotency-Key so retries return the same order
  // instead of creating duplicates. Passed through to orderService.createOrder.
  const payload = { ...req.body };
  if (req.headers['idempotency-key']) payload.idempotencyKey = req.headers['idempotency-key'];

  const result = await orderService.createOrder(req.user.id, payload);
  // Real-time: notify vendors + admin that a new order was placed.
  if (!result.replayed) {
    require('../socket/socket').broadcastOrderStatus(result.orderId, 'placed', {
      orderNumber: result.orderNumber,
      total: result.total,
      message: 'New order placed',
    }).catch(() => {});
  }
  sendCreated(res, result, result.replayed ? 'Order already placed' : 'Order placed successfully');
});

/** GET /orders */
const getUserOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getUserOrders(req.user.id, req.query);
  sendPaginated(res, { ...result, message: 'Orders fetched' });
});

/** GET /orders/my/:orderId */
const getMyOrder = asyncHandler(async (req, res) => {
  await syncOrderShipments(req.params.orderId);
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
  let result = await orderService.getVendorOrders(req.vendor.id, req.query);
  // Live-sync the real Shiprocket status for this vendor's active shipments on
  // the page (best-effort), then re-fetch so the rows carry the fresh status.
  const ids = (result.orders || []).map((o) => o.id);
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const active = await queryRows(
      `SELECT * FROM shipments WHERE vendor_id = ? AND order_id IN (${placeholders}) AND awb_code IS NOT NULL
       AND status IN ('processing','ready_to_ship','shipped','in_transit','out_for_delivery','rto_initiated')`,
      [req.vendor.id, ...ids]
    );
    await Promise.all(
      active.map((s) => shipmentService.syncShipment(s.id).catch((err) => logger.warn(`[Order] Live sync skip ${s.id}: ${err.message}`)))
    );
    result = await orderService.getVendorOrders(req.vendor.id, req.query);
  }
  sendPaginated(res, { ...result, message: 'Vendor orders fetched' });
});

/** GET /orders/vendor/:orderId */
const getVendorOrderDetail = asyncHandler(async (req, res) => {
  // Live-sync the vendor's active shipment so the returned status is real.
  const activeShipments = await queryRows(
    `SELECT * FROM shipments WHERE order_id = ? AND vendor_id = ? AND awb_code IS NOT NULL
     AND status IN ('processing','ready_to_ship','shipped','in_transit','out_for_delivery','rto_initiated')`,
    [req.params.orderId, req.vendor.id]
  );
  for (const s of activeShipments) {
    try {
      await shipmentService.syncShipment(s.id);
    } catch (err) {
      logger.warn(`[Order] Live sync skipped for shipment ${s.id}: ${err.message}`);
    }
  }
  const order = await orderService.getVendorOrder(req.vendor.id, req.params.orderId);
  sendSuccess(res, order);
});

/** PATCH /orders/vendor/:orderId/confirm */
const confirmVendorOrder = asyncHandler(async (req, res) => {
  await query("UPDATE order_items SET status = 'processing' WHERE order_id = ? AND vendor_id = ?", [req.params.orderId, req.vendor.id]);
  await query("UPDATE orders SET status = 'processing' WHERE id = ?", [req.params.orderId]);

  // Real-time: this vendor confirmed; update customer + admin immediately.
  require('../socket/socket').broadcastOrderStatus(req.params.orderId, 'processing', {
    vendorId: req.vendor.id,
    itemStatus: 'processing',
    message: 'Order confirmed by vendor',
  }).catch(() => {});

  // Automatically create the Shiprocket order + courier/AWB + shipping label for
  // this vendor's items so the real delivery lifecycle starts immediately.
  (async () => {
    try {
      const shipment = await shipmentService.createOrderShipment(req.params.orderId, req.vendor.id);
      logger.info(`[Order] Auto-shipment created for order=${req.params.orderId} vendor=${req.vendor.id} awb=${shipment.awb_code}`);
      if (shipment.awb_code) {
        try {
          const order = await queryOne(
            `SELECT o.order_number, o.id, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?`,
            [req.params.orderId]
          );
          if (order) {
            await emailService.sendOrderShippedEmail(order.email, order.name, { order_number: order.order_number, id: order.id }, shipment.awb_code);
          }
        } catch (e) {}
      }
    } catch (err) {
      logger.error(`[Order] Auto-shipment failed for order=${req.params.orderId}: ${err.message}`);
    }
  })();

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

  // Real-time: shipment marked shipped.
  require('../socket/socket').broadcastOrderStatus(req.params.orderId, 'shipped', {
    vendorId: req.vendor.id,
    itemStatus: 'shipped',
    awb: trackingId || null,
    courierName: courierName || null,
    message: 'Order shipped',
  }).catch(() => {});

  // Fire-and-forget: send shipped email to customer
  (async () => {
    try {
      const order = await queryOne(
        `SELECT o.order_number, o.id, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?`,
        [req.params.orderId]
      );
      if (order) {
        await emailService.sendOrderShippedEmail(order.email, order.name, { order_number: order.order_number, id: order.id }, trackingId);
      }
    } catch (e) {}
  })();

  sendSuccess(res, null, 'Order marked as shipped');
});

/** PATCH /orders/vendor/:orderId/deliver */
const deliverVendorOrder = asyncHandler(async (req, res) => {
  await query("UPDATE order_items SET status = 'delivered' WHERE order_id = ? AND vendor_id = ?", [req.params.orderId, req.vendor.id]);
  await query("UPDATE orders SET status = 'delivered', delivered_at = NOW() WHERE id = ?", [req.params.orderId]);

  // COD auto-capture: mark payment as paid on delivery. Must complete BEFORE the
  // broadcast below so the real-time payload carries the freshly-captured
  // paymentStatus instead of a stale "pending".
  const order = await queryOne('SELECT payment_method, payment_status FROM orders WHERE id = ?', [req.params.orderId]);
  if (order && order.payment_method === 'cod' && order.payment_status !== 'paid') {
    await query("UPDATE orders SET payment_status = 'paid' WHERE id = ? AND payment_method = 'cod'", [req.params.orderId]);
    // Also update any payment row if present
    await query("UPDATE payments SET status = 'captured' WHERE order_id = ? AND status IN ('pending','authorized')", [req.params.orderId]);
  }

  // Fire-and-forget: send delivered email + process rewards
  processDeliveryRewards(req.params.orderId).catch(() => {});

  // Real-time: shipment marked delivered.
  require('../socket/socket').broadcastOrderStatus(req.params.orderId, 'delivered', {
    vendorId: req.vendor.id,
    itemStatus: 'delivered',
    message: 'Order delivered',
  }).catch(() => {});
  (async () => {
    try {
      const order = await queryOne(
        `SELECT o.order_number, o.id, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?`,
        [req.params.orderId]
      );
      if (order) {
        await emailService.sendOrderDeliveredEmail(order.email, order.name, { order_number: order.order_number, id: order.id });
      }
    } catch (e) {}
  })();

  sendSuccess(res, null, 'Order marked as delivered');
});

// ─── Admin ────────────────────────────────────────────────────────────────────

/** GET /orders/admin */
const getAllOrders = asyncHandler(async (req, res) => {
  let result = await orderService.getAllOrders(req.query);
  // Live-sync the real Shiprocket status for orders on this page so the returned
  // rows reflect the current courier state (best-effort, no-op when no active AWB).
  const ids = (result.orders || []).map(o => o.id);
  await Promise.all(ids.map((id) => syncOrderShipments(id).catch(() => {})));
  // Re-fetch so the returned rows carry the freshly synced shipment status.
  result = await orderService.getAllOrders(req.query);
  sendPaginated(res, { ...result, message: 'All orders fetched' });
});

/** GET /orders/admin/stats */
const getOrderStats = asyncHandler(async (req, res) => {
  const stats = await orderService.getOrderStats();
  sendSuccess(res, stats);
});

/** GET /orders/admin/:orderId */
const getAdminOrder = asyncHandler(async (req, res) => {
  await syncOrderShipments(req.params.orderId);
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
  getVendorOrderDetail,
  confirmVendorOrder,
  shipVendorOrder,
  deliverVendorOrder,
  getAllOrders,
  getOrderStats,
  getAdminOrder,
  updateOrderStatus,
};

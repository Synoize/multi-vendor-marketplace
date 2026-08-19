/**
 * Damini Marketplace - Payment Service (Razorpay)
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('config');
const { query, queryOne, transaction } = require('../database/connection');
const orderService = require('./order.service');
const emailService = require('./email.service');
const notificationService = require('./notification.service');

const razorpay = new Razorpay({
  key_id: config.get('razorpay.keyId'),
  key_secret: config.get('razorpay.keySecret'),
});

// The razorpay SDK doesn't forward a `timeout` constructor option to its
// internal axios instance; set one so a slow/unreachable API fails fast
// with a clear error instead of hanging the request indefinitely.
razorpay.api.rq.defaults.timeout = 25000;

const SESSION_TTL_MINUTES = 30;

/**
 * Legacy: create Razorpay order for an already-existing order (used by adsmanager).
 */
const createRazorpayOrder = async (orderId, userId) => {
  const order = await queryOne('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

  const amountPaise = Math.round(parseFloat(order.total) * 100);
  const rzpOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: order.order_number,
    notes: { orderId, userId },
  });

  await query(
    'INSERT INTO payments (order_id, user_id, razorpay_order_id, amount, status) VALUES (?, ?, ?, ?, "created")',
    [orderId, userId, rzpOrder.id, order.total]
  );

  return {
    razorpayOrderId: rzpOrder.id,
    amount: amountPaise,
    currency: 'INR',
    key: config.get('razorpay.keyId'),
    orderId,
    orderNumber: order.order_number,
  };
};

/**
 * Initiate Razorpay payment for a checkout.
 * Validates the checkout & sizes the Razorpay order, but does NOT create the
 * marketplace order — it is only created after payment is captured & verified.
 */
const initiateRazorpayOrder = async (userId, payload) => {
  const { total } = await orderService.computeCheckout(userId, payload);

  const amountPaise = Math.round(parseFloat(total) * 100);
  if (amountPaise <= 0) {
    throw Object.assign(new Error('Invalid order amount'), { statusCode: 400 });
  }

  const rzpOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `CHK${Date.now()}`,
    notes: { userId, checkout: '1' },
  });

  await query(
    `INSERT INTO checkout_sessions (user_id, razorpay_order_id, payload, amount, status, expires_at)
     VALUES (?, ?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL ${SESSION_TTL_MINUTES} MINUTE))`,
    [userId, rzpOrder.id, JSON.stringify(payload), total]
  );

  return {
    razorpayOrderId: rzpOrder.id,
    amount: amountPaise,
    currency: 'INR',
    key: config.get('razorpay.keyId'),
  };
};

/**
 * Verify Razorpay payment signature and, only after it passes, create the
 * marketplace order and mark it as paid.
 */
const verifyPayment = async (razorpayOrderId, razorpayPaymentId, signature, userId) => {
  const expectedSig = crypto
    .createHmac('sha256', config.get('razorpay.keySecret'))
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSig !== signature) {
    throw Object.assign(new Error('Payment verification failed. Invalid signature.'), { statusCode: 400 });
  }

  const session = await queryOne(
    'SELECT * FROM checkout_sessions WHERE razorpay_order_id = ?',
    [razorpayOrderId]
  );
  if (!session) {
    throw Object.assign(new Error('Checkout session not found. Please place the order again.'), { statusCode: 400 });
  }
  if (session.status !== 'pending') {
    throw Object.assign(new Error('This payment has already been processed.'), { statusCode: 400 });
  }
  if (new Date() > new Date(session.expires_at)) {
    await query('UPDATE checkout_sessions SET status = "expired" WHERE id = ?', [session.id]);
    throw Object.assign(new Error('Payment session has expired. Please place the order again.'), { statusCode: 400 });
  }

  const payload = typeof session.payload === 'string' ? JSON.parse(session.payload) : session.payload;

  // Only now create the order (deducts stock, clears cart, sends notifications)
  let order;
  try {
    order = await orderService.createOrder(userId, payload);
  } catch (err) {
    await query('UPDATE checkout_sessions SET status = "failed" WHERE id = ?', [session.id]);
    throw err;
  }

  await transaction(async (conn) => {
    await conn.execute(
      `INSERT INTO payments (order_id, user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, status, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, 'captured', NOW())`,
      [order.orderId, userId, razorpayOrderId, razorpayPaymentId, signature, session.amount]
    );
    await conn.execute(
      "UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE id = ? AND user_id = ?",
      [order.orderId, userId]
    );
    await conn.execute(
      "UPDATE checkout_sessions SET status = 'completed' WHERE id = ?",
      [session.id]
    );
  });

  const paidOrder = await queryOne('SELECT order_number, total FROM orders WHERE id = ?', [order.orderId]);
  const user = await queryOne('SELECT name, email FROM users WHERE id = ?', [userId]);
  try {
    await notificationService.createNotification(userId, {
      title: 'Payment Successful',
      message: `Payment of ₹${paidOrder.total} for order #${paidOrder.order_number} confirmed.`,
      type: 'payment',
      referenceId: order.orderId,
    });
  } catch (e) {}

  return { message: 'Payment verified successfully', orderId: order.orderId, orderNumber: paidOrder.order_number };
};

/**
 * Initiate refund via Razorpay
 */
const initiateRefund = async (refundId) => {
  const refund = await queryOne(
    `SELECT r.*, p.razorpay_payment_id FROM refunds r JOIN payments p ON r.payment_id = p.id WHERE r.id = ?`,
    [refundId]
  );
  if (!refund) throw Object.assign(new Error('Refund not found'), { statusCode: 404 });
  if (!refund.razorpay_payment_id) throw Object.assign(new Error('Payment not found for this order'), { statusCode: 400 });

  const rzpRefund = await razorpay.payments.refund(refund.razorpay_payment_id, {
    amount: Math.round(parseFloat(refund.amount) * 100),
    notes: { refundId, reason: refund.reason },
  });

  await query(
    "UPDATE refunds SET razorpay_refund_id = ?, status = 'processing', processed_at = NOW() WHERE id = ?",
    [rzpRefund.id, refundId]
  );

  return rzpRefund;
};

/**
 * Handle Razorpay webhook
 */
const handleWebhook = async (body, signature) => {
  const expectedSig = crypto
    .createHmac('sha256', config.get('razorpay.webhookSecret'))
    .update(JSON.stringify(body))
    .digest('hex');

  if (expectedSig !== signature) throw new Error('Invalid webhook signature');

  const { event, payload } = body;

  if (event === 'payment.captured') {
    const paymentId = payload.payment.entity.id;
    const rzpOrderId = payload.payment.entity.order_id;
    await query(
      "UPDATE payments SET status = 'captured', paid_at = NOW() WHERE razorpay_order_id = ? AND razorpay_payment_id = ?",
      [rzpOrderId, paymentId]
    );
  } else if (event === 'refund.processed') {
    const rzpRefundId = payload.refund.entity.id;
    await query(
      "UPDATE refunds SET status = 'completed' WHERE razorpay_refund_id = ?",
      [rzpRefundId]
    );
  }
};

module.exports = { initiateRazorpayOrder, createRazorpayOrder, verifyPayment, initiateRefund, handleWebhook };

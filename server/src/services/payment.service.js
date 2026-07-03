/**
 * Damini Marketplace - Payment Service (Razorpay)
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('config');
const { query, queryOne, transaction } = require('../database/connection');
const emailService = require('./email.service');
const notificationService = require('./notification.service');

const razorpay = new Razorpay({
  key_id: config.get('razorpay.keyId'),
  key_secret: config.get('razorpay.keySecret'),
});

/**
 * Create Razorpay order and save to payments table
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
 * Verify Razorpay payment signature and mark order as paid
 */
const verifyPayment = async (razorpayOrderId, razorpayPaymentId, signature, orderId, userId) => {
  const expectedSig = crypto
    .createHmac('sha256', config.get('razorpay.keySecret'))
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSig !== signature) {
    throw Object.assign(new Error('Payment verification failed. Invalid signature.'), { statusCode: 400 });
  }

  await transaction(async (conn) => {
    await conn.execute(
      `UPDATE payments SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'captured', paid_at = NOW()
       WHERE razorpay_order_id = ?`,
      [razorpayPaymentId, signature, razorpayOrderId]
    );
    await conn.execute(
      "UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE id = ? AND user_id = ?",
      [orderId, userId]
    );
  });

  const order = await queryOne('SELECT order_number, total FROM orders WHERE id = ?', [orderId]);
  const user = await queryOne('SELECT name, email FROM users WHERE id = ?', [userId]);
  try {
    await notificationService.createNotification(userId, {
      title: 'Payment Successful',
      message: `Payment of ₹${order.total} for order #${order.order_number} confirmed.`,
      type: 'payment',
      referenceId: orderId,
    });
  } catch (e) {}

  return { message: 'Payment verified successfully', orderNumber: order.order_number };
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

module.exports = { createRazorpayOrder, verifyPayment, initiateRefund, handleWebhook };

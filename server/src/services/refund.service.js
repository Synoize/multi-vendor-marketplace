/**
 * Damini Marketplace - Refund Service
 * Handles Razorpay refunds and refund record management.
 */

'use strict';

const Razorpay = require('razorpay');
const config = require('config');
const { queryRows, queryOne } = require('../database/connection');
const { getPagination } = require('../utils/pagination.util');
const { createNotification } = require('./notification.service');
const logger = require('../utils/logger.util');

// ─── Razorpay instance ────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: config.get('razorpay.keyId'),
  key_secret: config.get('razorpay.keySecret'),
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. initiateRefund
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initiate a refund via Razorpay and create a refund record.
 * For COD orders, the refund is handled offline (status=processing).
 * @param {string} orderId    - Internal order UUID
 * @param {string} paymentId  - Internal payment UUID (in our DB)
 * @param {number} amount     - Amount in INR (will be converted to paise)
 * @param {string} reason     - Reason for refund
 * @param {string} [returnId] - Optional linked return UUID
 * @returns {Promise<Object>} - Created refund record
 */
async function initiateRefund(orderId, paymentId, amount, reason, returnId = null) {
  logger.info(`[RefundService] Initiating refund for order=${orderId}, amount=₹${amount}`);

  // Validate order and payment
  const order = await queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

  const payment = await queryOne('SELECT * FROM payments WHERE id = ?', [paymentId]);
  if (!payment) throw Object.assign(new Error('Payment record not found'), { statusCode: 404 });

  // Check for duplicate refund
  const existing = await queryOne(
    "SELECT id FROM refunds WHERE order_id = ? AND return_id = ? AND status != 'failed'",
    [orderId, returnId]
  );
  if (existing) throw Object.assign(new Error('Refund already exists for this return'), { statusCode: 409 });

  let rzpRefundId = null;

  // Attempt Razorpay refund only for prepaid orders
  if (order.payment_method !== 'cod' && payment.razorpay_payment_id) {
    try {
      const rzpRefund = await razorpay.payments.refund(payment.razorpay_payment_id, {
        amount: Math.round(amount * 100), // paise
        speed: 'normal',
        notes: { reason, orderId },
      });
      rzpRefundId = rzpRefund.id;
      logger.info(`[RefundService] Razorpay refund created: ${rzpRefundId}`);
    } catch (rzpErr) {
      logger.error('[RefundService] Razorpay refund failed:', rzpErr.message);
      throw Object.assign(new Error(`Razorpay refund failed: ${rzpErr.error?.description || rzpErr.message}`), { statusCode: 502 });
    }
  }

  // Create refund record in DB
  await queryRows(
    `INSERT INTO refunds
       (order_id, payment_id, return_id, user_id, amount, reason, razorpay_refund_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId,
      paymentId,
      returnId,
      order.user_id,
      amount,
      reason,
      rzpRefundId,
      rzpRefundId ? 'processing' : 'pending',
    ]
  );

  const refund = await queryOne('SELECT * FROM refunds WHERE id = LAST_INSERT_ID()');

  // Notify user
  await createNotification(order.user_id, {
    title: 'Refund Initiated',
    message: `Your refund of ₹${amount} for order #${order.order_number} has been initiated. It will reflect in 5-7 business days.`,
    type: 'refund',
    referenceId: refund?.id,
    referenceType: 'refund',
  });

  // Update order payment status
  await queryRows(
    "UPDATE orders SET payment_status = 'refunded' WHERE id = ?",
    [orderId]
  );

  return refund;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. updateRefundStatus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update the status of a refund record (admin/webhook).
 * @param {string} refundId - Refund UUID
 * @param {string} status   - New status: pending|processing|completed|failed
 * @returns {Promise<Object>}
 */
async function updateRefundStatus(refundId, status) {
  const refund = await queryOne('SELECT * FROM refunds WHERE id = ?', [refundId]);
  if (!refund) throw Object.assign(new Error('Refund not found'), { statusCode: 404 });

  const processedAt = status === 'completed' ? new Date() : null;

  await queryRows(
    'UPDATE refunds SET status = ?, processed_at = ? WHERE id = ?',
    [status, processedAt, refundId]
  );

  if (status === 'completed') {
    await createNotification(refund.user_id, {
      title: 'Refund Completed',
      message: `Your refund of ₹${refund.amount} has been credited to your account.`,
      type: 'refund',
      referenceId: refundId,
      referenceType: 'refund',
    });
  }

  logger.info(`[RefundService] Refund ${refundId} status → ${status}`);
  return queryOne('SELECT * FROM refunds WHERE id = ?', [refundId]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. getRefunds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get paginated list of refunds with optional filters.
 * @param {Object} filters - { userId, orderId, status, page, limit }
 * @returns {Promise<{ refunds: Array, total: number }>}
 */
async function getRefunds(filters = {}) {
  const { userId, orderId, status, page = 1, limit = 20 } = filters;
  const { offset } = getPagination({ page, limit }, limit);

  const conditions = [];
  const params = [];

  if (userId) { conditions.push('r.user_id = ?'); params.push(userId); }
  if (orderId) { conditions.push('r.order_id = ?'); params.push(orderId); }
  if (status) { conditions.push('r.status = ?'); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [refunds, countRows] = await Promise.all([
    queryRows(
      `SELECT r.*, o.order_number, u.name AS user_name, u.email AS user_email
       FROM refunds r
       JOIN orders o ON o.id = r.order_id
       JOIN users u ON u.id = r.user_id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    queryRows(`SELECT COUNT(*) AS total FROM refunds r ${where}`, params),
  ]);

  return { refunds, total: countRows[0]?.total || 0 };
}

module.exports = {
  initiateRefund,
  updateRefundStatus,
  getRefunds,
};

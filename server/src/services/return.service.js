/**
 * Damini Marketplace - Return Service
 * Handles return requests, status updates, and queries.
 */

'use strict';

const { queryRows, queryOne, transaction } = require('../database/connection');
const { getPagination } = require('../utils/pagination.util');
const { createNotification } = require('./notification.service');
const logger = require('../utils/logger.util');

// ─────────────────────────────────────────────────────────────────────────────
// 1. requestReturn
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a return request for an order item.
 * Validates return window and product return policy.
 * @param {string} orderItemId - order_items UUID
 * @param {string} userId      - Requesting user UUID
 * @param {Object} data        - { reason, description, images, type }
 * @returns {Promise<Object>}  - Created return record
 */
async function requestReturn(orderItemId, userId, data) {
  const { reason, description, images = [], type = 'return' } = data;

  // Fetch order item with product and order info
  const item = await queryOne(
    `SELECT oi.*, o.user_id AS order_user_id, o.delivered_at, o.id AS order_id,
            p.is_returnable, p.return_window, p.return_type
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     WHERE oi.id = ?`,
    [orderItemId]
  );

  if (!item) throw Object.assign(new Error('Order item not found'), { statusCode: 404 });
  if (item.order_user_id !== userId) throw Object.assign(new Error('Unauthorized'), { statusCode: 403 });
  if (!item.is_returnable) throw Object.assign(new Error('This product is not returnable'), { statusCode: 400 });
  if (item.status !== 'delivered') {
    throw Object.assign(new Error('Item must be delivered before requesting a return'), { statusCode: 400 });
  }

  // Check return window
  if (item.delivered_at) {
    const daysSinceDelivery = Math.floor((Date.now() - new Date(item.delivered_at).getTime()) / 86_400_000);
    if (daysSinceDelivery > item.return_window) {
      throw Object.assign(
        new Error(`Return window of ${item.return_window} days has expired`),
        { statusCode: 400 }
      );
    }
  }

  // Check no duplicate pending return
  const existing = await queryOne(
    "SELECT id FROM returns WHERE order_item_id = ? AND status NOT IN ('rejected','cancelled')",
    [orderItemId]
  );
  if (existing) throw Object.assign(new Error('A return request already exists for this item'), { statusCode: 409 });

  // Create return record
  const returnRecord = await transaction(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO returns
         (order_id, order_item_id, user_id, vendor_id, reason, description, images, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.order_id, orderItemId, userId, item.vendor_id, reason, description || null, JSON.stringify(images), type]
    );

    // Update item status
    await conn.execute(
      "UPDATE order_items SET status = 'return_requested' WHERE id = ?",
      [orderItemId]
    );

    return queryOne('SELECT * FROM returns WHERE id = LAST_INSERT_ID()');
  });

  // Send notification to user
  await createNotification(userId, {
    title: 'Return Request Submitted',
    message: `Your return request for "${item.product_name}" has been submitted and is under review.`,
    type: 'return',
    referenceId: returnRecord?.id,
    referenceType: 'return',
  });

  logger.info(`[ReturnService] Return requested for orderItem=${orderItemId} by user=${userId}`);
  return returnRecord;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. updateReturnStatus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin/vendor updates the status of a return request.
 * @param {string} returnId  - Return UUID
 * @param {string} status    - New status ENUM
 * @param {string} adminNotes - Notes from admin
 * @returns {Promise<Object>}
 */
async function updateReturnStatus(returnId, status, adminNotes = null) {
  const ret = await queryOne('SELECT * FROM returns WHERE id = ?', [returnId]);
  if (!ret) throw Object.assign(new Error('Return not found'), { statusCode: 404 });

  await queryRows(
    'UPDATE returns SET status = ?, admin_notes = ? WHERE id = ?',
    [status, adminNotes, returnId]
  );

  // Notify user
  const statusMessages = {
    approved: 'Your return request has been approved. Pickup will be scheduled.',
    rejected: 'Your return request has been rejected.',
    completed: 'Your return has been processed successfully.',
    pickup_scheduled: 'Your pickup has been scheduled.',
    picked_up: 'Your return package has been picked up.',
  };

  if (statusMessages[status]) {
    await createNotification(ret.user_id, {
      title: 'Return Status Update',
      message: statusMessages[status],
      type: 'return',
      referenceId: returnId,
      referenceType: 'return',
    });
  }

  logger.info(`[ReturnService] Return ${returnId} status updated to ${status}`);
  return queryOne('SELECT * FROM returns WHERE id = ?', [returnId]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. getReturns
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get paginated list of returns with optional filters.
 * @param {Object} filters - { userId, vendorId, status, page, limit }
 * @returns {Promise<{ returns: Array, total: number }>}
 */
async function getReturns(filters = {}) {
  const { userId, vendorId, status, page = 1, limit = 20 } = filters;
  const { offset } = getPagination({ page, limit }, limit);

  const conditions = [];
  const params = [];

  if (userId) { conditions.push('r.user_id = ?'); params.push(userId); }
  if (vendorId) { conditions.push('r.vendor_id = ?'); params.push(vendorId); }
  if (status) { conditions.push('r.status = ?'); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [returns, countRows] = await Promise.all([
    queryRows(
      `SELECT r.*, oi.product_name, oi.unit_price, oi.quantity,
              u.name AS user_name, u.email AS user_email
       FROM returns r
       JOIN order_items oi ON oi.id = r.order_item_id
       JOIN users u ON u.id = r.user_id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    queryRows(`SELECT COUNT(*) AS total FROM returns r ${where}`, params),
  ]);

  return { returns, total: countRows[0]?.total || 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. getReturnById
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a single return by ID with full details.
 * @param {string} id - Return UUID
 * @returns {Promise<Object>}
 */
async function getReturnById(id) {
  const ret = await queryOne(
    `SELECT r.*, oi.product_name, oi.unit_price, oi.quantity,
            u.name AS user_name, u.email AS user_email,
            v.business_name AS vendor_name
     FROM returns r
     JOIN order_items oi ON oi.id = r.order_item_id
     JOIN users u ON u.id = r.user_id
     JOIN vendors v ON v.id = r.vendor_id
     WHERE r.id = ?`,
    [id]
  );
  if (!ret) throw Object.assign(new Error('Return not found'), { statusCode: 404 });
  return ret;
}

module.exports = {
  requestReturn,
  updateReturnStatus,
  getReturns,
  getReturnById,
};

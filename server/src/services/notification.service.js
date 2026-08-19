/**
 * Damini Marketplace - Notification Service
 * In-app notifications stored in `notifications` table.
 * Emits real-time events via Socket.io when io is available.
 */

'use strict';

const { query, queryRows, queryOne } = require('../database/connection');
const { getPagination } = require('../utils/pagination.util');
const logger = require('../utils/logger.util');

// io is lazily required to avoid circular deps; set via setIO()
let _io = null;

/**
 * Inject Socket.io instance (called from socket.js after init).
 * @param {import('socket.io').Server} io
 */
function setIO(io) {
  _io = io;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. createNotification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a notification for a user and push it via Socket.io.
 * @param {string} userId - Recipient user UUID
 * @param {Object} data
 * @param {string} data.title
 * @param {string} data.message
 * @param {string} [data.type]          - ENUM: order|payment|promotion|system|return|refund|stock|review
 * @param {string} [data.referenceId]   - Related entity ID
 * @param {string} [data.referenceType] - e.g. 'order', 'product'
 * @returns {Promise<Object>} - Created notification
 */
async function createNotification(userId, { title, message, type = 'system', referenceId = null, referenceType = null }) {
  const [result] = await query(
    `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, title, message, type, referenceId, referenceType]
  );

  // Fetch newly created notification
  const notification = await queryOne('SELECT * FROM notifications WHERE id = LAST_INSERT_ID()');

  // Push real-time notification if socket.io is available
  if (_io) {
    _io.to(`user:${userId}`).emit('new_notification', notification);
  }

  logger.info(`[NotificationService] Created notification for user=${userId}: ${title}`);
  return notification;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. getUserNotifications
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get paginated notifications for a user, newest first.
 * @param {string} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{ notifications: Array, total: number, unreadCount: number }>}
 */
async function getUserNotifications(userId, page = 1, limit = 20) {
  const { offset } = getPagination({ page, limit }, limit);

  const [notifications, countRows, unreadRows] = await Promise.all([
    queryRows(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    ),
    queryRows('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?', [userId]),
    queryRows('SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId]),
  ]);

  return {
    notifications,
    total: countRows[0]?.total || 0,
    unreadCount: unreadRows[0]?.cnt || 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. markAsRead
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read (only if it belongs to the user).
 * @param {string} notificationId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function markAsRead(notificationId, userId) {
  const [result] = await query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  return result?.affectedRows > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. markAllAsRead
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mark all unread notifications as read for a user.
 * @param {string} userId
 * @returns {Promise<number>} - Number of rows affected
 */
async function markAllAsRead(userId) {
  const [result] = await query(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return result?.affectedRows || 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. getUnreadCount
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get unread notification count for a user.
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getUnreadCount(userId) {
  const row = await queryOne(
    'SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return row?.cnt || 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. deleteNotification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete a notification (only if it belongs to the user).
 * @param {string} id     - Notification UUID
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function deleteNotification(id, userId) {
  const [result] = await query(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result?.affectedRows > 0;
}

module.exports = {
  setIO,
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
};

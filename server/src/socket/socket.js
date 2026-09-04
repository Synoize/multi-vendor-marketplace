/**
 * Damini Marketplace - Socket.io Integration
 * Real-time events: order updates, notifications, chat
 */

const { Server } = require('socket.io');
const config = require('config');
const { verifyAccessToken, getAccessTokenFromCookies } = require('../utils/token.util');
const { queryOne, queryRows } = require('../database/connection');
const logger = require('../utils/logger.util');

let io;

/**
 * Initialize Socket.io server
 * @param {http.Server} server
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.get('cors.origins'),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ─── Authentication middleware ───────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      // Token may arrive via handshake.auth.token or via cookies (our auth flow
      // sets role-prefixed cookies like customerAccessToken/vendorAccessToken/
      // adminAccessToken, so reuse the same parser the REST API uses).
      const token = socket.handshake.auth?.token ||
        getAccessTokenFromCookies(
          (socket.handshake.headers?.cookie || '').split(';').reduce((acc, c) => {
            const eq = c.indexOf('=');
            if (eq === -1) return acc;
            const key = c.slice(0, eq).trim();
            const val = c.slice(eq + 1).trim();
            if (key) acc[key] = decodeURIComponent(val);
            return acc;
          }, {})
        );

      if (!token) {
        // Allow unauthenticated connections (for public events)
        socket.userId = null;
        return next();
      }

      const decoded = verifyAccessToken(token);
      const user = await queryOne('SELECT id, name, role FROM users WHERE id = ? AND is_active = 1', [decoded.id]);
      if (!user) return next(new Error('Authentication failed'));

      socket.userId = user.id;
      socket.userRole = user.role;
      socket.userName = user.name;
      next();
    } catch (err) {
      socket.userId = null;
      next();
    }
  });

  // ─── Connection handler ──────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user: ${socket.userId || 'anonymous'})`);

    // Join personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      logger.debug(`User ${socket.userId} joined personal room`);
    }

    // Admins share a room so order updates reach every admin panel in real time.
    if (socket.userRole === 'admin') {
      socket.join('admins');
      logger.debug(`Admin ${socket.userId} joined admin room`);
    }

    // ─── Events ─────────────────────────────────────────────────────────────────

    /** Join a specific room (e.g., order tracking room) */
    socket.on('join_room', (room) => {
      socket.join(room);
    });

    /** Leave a room */
    socket.on('leave_room', (room) => {
      socket.leave(room);
    });

    /** Typing indicator for chat */
    socket.on('typing', ({ ticketId }) => {
      socket.to(`ticket:${ticketId}`).emit('user_typing', { userId: socket.userId, name: socket.userName });
    });

    /** Join support ticket room */
    socket.on('join_ticket', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });

    socket.on('error', (err) => {
      logger.error('Socket error:', err);
    });
  });

  logger.info('Socket.io initialized');
  return io;
};

/**
 * Get Socket.io instance
 */
const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

/**
 * Send notification to specific user
 */
const sendToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

/**
 * Broadcast order update
 */
const broadcastOrderUpdate = (orderId, userId, status, data = {}) => {
  if (io) {
    io.to(`user:${userId}`).emit('order_update', { orderId, status, ...data });
    io.to(`order:${orderId}`).emit('order_status_change', { status, ...data });
  }
};

/**
 * Broadcast an order status change in real time to every interested app:
 * the customer (order owner), every vendor with items in the order (their
 * vendor apps), the admin panel (shared admin room) and the order tracking
 * room. Clean no-op if socket.io is not initialized.
 * @param {string} orderId - Internal order UUID
 * @param {string} status  - New order status
 * @param {Object} [data]  - Extra fields (vendorId, itemStatus, awb, message...)
 */
const broadcastOrderStatus = async (orderId, status, data = {}) => {
  if (!io || !orderId) return;

  const payload = { orderId, status, ...data };
  const rooms = new Set([`order:${orderId}`, 'admins']);

  try {
    const order = await queryOne(
      'SELECT user_id, total, order_number, payment_status, payment_method FROM orders WHERE id = ?',
      [orderId]
    );
    if (order?.user_id) rooms.add(`user:${order.user_id}`);
    payload.paymentStatus = order?.payment_status || null;

    // Tracking block for the app UI: this vendor's shipment when data.vendorId
    // is given, otherwise the most recent active shipment on the order.
    const shipment = await queryOne(
      `SELECT status, courier_name, awb_code, tracking_url FROM shipments
       WHERE order_id = ? ${data.vendorId ? 'AND vendor_id = ?' : ''}
       ORDER BY updated_at DESC LIMIT 1`,
      data.vendorId ? [orderId, data.vendorId] : [orderId]
    );
    payload.tracking = shipment
      ? {
          status: shipment.status,
          courier: shipment.courier_name || null,
          awb: shipment.awb_code,
          trackingUrl: shipment.tracking_url,
        }
      : null;

    const vendors = await queryRows(
      `SELECT DISTINCT u.id AS user_id FROM order_items oi
       JOIN vendors v ON v.id = oi.vendor_id
       JOIN users u ON u.id = v.user_id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    for (const v of vendors) {
      if (v.user_id) rooms.add(`user:${v.user_id}`);
    }
  } catch (err) {
    logger.warn(`[Socket] Could not resolve rooms for order ${orderId}: ${err.message}`);
  }

  for (const room of rooms) {
    io.to(room).emit('order_update', payload);
    io.to(room).emit('order_status_change', payload);
  }
};

/**
 * Broadcast stock update
 */
const broadcastStockUpdate = (productId, stock) => {
  if (io) io.emit('stock_update', { productId, stock });
};

/**
 * Send new ticket message notification
 */
const broadcastTicketMessage = (ticketId, message) => {
  if (io) io.to(`ticket:${ticketId}`).emit('new_message', message);
};

module.exports = { initSocket, getIO, sendToUser, broadcastOrderUpdate, broadcastOrderStatus, broadcastStockUpdate, broadcastTicketMessage };

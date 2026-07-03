/**
 * Damini Marketplace - Socket.io Integration
 * Real-time events: order updates, notifications, chat
 */

const { Server } = require('socket.io');
const config = require('config');
const { verifyAccessToken } = require('../utils/token.util');
const { queryOne } = require('../database/connection');
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
      const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie
        ?.split(';').find(c => c.trim().startsWith('accessToken='))?.split('=')[1];

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

module.exports = { initSocket, getIO, sendToUser, broadcastOrderUpdate, broadcastStockUpdate, broadcastTicketMessage };

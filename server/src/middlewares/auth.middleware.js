/**
 * Damini Marketplace - Authentication Middleware
 * Verifies JWT from cookies or Authorization header
 */

const { verifyAccessToken } = require('../utils/token.util');
const { queryOne } = require('../database/connection');
const { sendError } = require('../utils/response.util');
const logger = require('../utils/logger.util');

/**
 * Protect routes — require valid JWT
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Try cookie first
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    // 2. Fallback to Bearer header
    else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Authentication required. Please log in.', 401);
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Fetch user from DB (ensures user still exists + is_active)
    const user = await queryOne(
      'SELECT id, name, email, role, is_active, is_verified FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return sendError(res, 'User not found. Please log in again.', 401);
    }

    if (!user.is_active) {
      return sendError(res, 'Your account has been deactivated.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Session expired. Please log in again.', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid token. Please log in again.', 401);
    }
    logger.error('Auth middleware error:', err);
    return sendError(res, 'Authentication failed', 401);
  }
};

/**
 * Require specific role(s)
 * Usage: requireRole('admin') or requireRole(['vendor', 'admin'])
 */
const requireRole = (...roles) => {
  const allowedRoles = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, `Access denied. Required role: ${allowedRoles.join(' or ')}`, 403);
    }
    next();
  };
};

/**
 * Optional auth — attaches user if token present, doesn't fail if absent
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken ||
      req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await queryOne(
        'SELECT id, name, email, role, is_active FROM users WHERE id = ? AND is_active = 1',
        [decoded.id]
      );
      req.user = user || null;
    }
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { protect, requireRole, optionalAuth };

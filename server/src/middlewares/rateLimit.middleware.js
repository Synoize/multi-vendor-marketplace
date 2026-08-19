/**
 * Damini Marketplace - Rate Limiting Middleware
 */

const rateLimit = require('express-rate-limit');
const config = require('config');

const windowMs = config.get('rateLimit.windowMs');
const max = config.get('rateLimit.max');
const authMax = config.get('rateLimit.authMax');

/** Paths that bypass rate limiting — public content served on every page load */
const skipPaths = config.get('rateLimit.skipPaths') || [];
const skip = (req) =>
  skipPaths.some((prefix) => req.originalUrl.startsWith(`/api${prefix}`));

const createRateLimiter = (options = {}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please try again later.',
    },
    ...options,
  });

/** Global API rate limiter */
const globalRateLimit = createRateLimiter({ max, skip });

/** Strict limiter for auth routes */
const authRateLimit = createRateLimiter({
  max: authMax,
  windowMs: 15 * 60 * 1000, // 15 min
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

/** OTP limiter — 3 attempts per window */
const otpRateLimit = createRateLimiter({
  max: 3,
  windowMs: 5 * 60 * 1000, // 5 min
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 5 minutes before requesting again.',
  },
});

/** Upload limiter */
const uploadRateLimit = createRateLimiter({
  max: 20,
  windowMs: 60 * 1000, // 1 min
  message: { success: false, message: 'Too many uploads. Please slow down.' },
});

module.exports = { globalRateLimit, authRateLimit, otpRateLimit, uploadRateLimit };

/**
 * Damini Marketplace - Policy-Based Rate Limiting Middleware
 *
 * Central factory for all API rate-limit policies. Values come from YAML config
 * (config/rateLimit.*). A single global safety-net limiter protects the whole
 * /api/v1 tree; per-route policies enforce the actual traffic rules.
 *
 * Usage:
 *   rateLimit("read")     // public read endpoints
 *   rateLimit("search")   // search / suggestions
 *   rateLimit("write")    // authenticated writes
 *   rateLimit("auth")     // login / register / forgot-password
 *   rateLimit("otp")      // OTP send / verify
 *   rateLimit("cart")     // cart mutations
 *   rateLimit("order")    // order creation
 *   rateLimit("payment")  // payment create / verify
 *   rateLimit("coupon")   // coupon validation
 *   rateLimit("review")   // review submission
 *   rateLimit("upload")   // file uploads
 *   rateLimit("admin")    // admin operations
 *
 * Keying:
 *   - Authenticated requests (req.user present)  -> "user:<id>"
 *   - Anonymous requests                         -> "ip:<req.ip>"
 *   This prevents one user from exhausting another user's limit while keeping
 *   brute-force protection per account/IP.
 *
 * NOTE ON STORE: Uses the default in-memory store. Limits are per Node.js
 * process and reset on restart. This is NOT suitable for horizontal scaling —
 * a shared store (e.g. Redis) can be added later without touching route files.
 */

const rateLimitLib = require('express-rate-limit');
const config = require('config');
const logger = require('./../utils/logger.util');

/** Resolve the effective policy set for the current environment. */
const resolvePolicies = () => {
  const raw = config.get('rateLimit');
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid rateLimit configuration: expected an object');
  }

  const env = String(config.util.getEnv('NODE_ENV') || config.get('app.env')).toLowerCase();
  const relaxed = env === 'development' || env === 'test';

  const readPolicy = (name) => {
    const def = raw[name];
    if (!def || typeof def.windowMs !== 'number' || typeof def.max !== 'number') {
      throw new Error(`Invalid rateLimit.${name}: windowMs and max must be numbers`);
    }
    const dev = relaxed && raw.dev ? raw.dev[name] : null;
    return {
      windowMs: dev ? dev.windowMs : def.windowMs,
      max: dev ? dev.max : def.max,
    };
  };

  const policyNames = [
    'global', 'read', 'write', 'search', 'auth', 'otp',
    'cart', 'order', 'payment', 'coupon', 'review', 'upload', 'admin',
  ];
  const policies = {};
  for (const name of policyNames) policies[name] = readPolicy(name);
  return { relaxed, policies };
};

/** Never create an unlimited (negative/zero/infinite) limiter from bad config. */
const validateMax = (max, policy) => {
  if (!Number.isFinite(max) || max <= 0) {
    throw new Error(`Refusing unsafe rateLimit for policy "${policy}": max must be a positive number`);
  }
  return Math.floor(max);
};

let resolved = null;
const ensureResolved = () => {
  if (!resolved) resolved = resolvePolicies();
  return resolved;
};

/** Honours rateLimit.enabled: when disabled, all limiters pass through. */
const isEnabled = () => {
  const raw = config.get('rateLimit');
  return raw && raw.enabled !== false;
};

const noop = (req, res, next) => next();

/** Per-policy limiter cache so each policy maps to one express-rate-limit instance. */
const limiterCache = {};

/** 429 handler shared by all policies (per-policy via closure). */
const buildHandler = (policy, windowMs, keyGenerator) => (req, res) => {
  res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
  logger.warn(
    `[RateLimit] policy=${policy} method=${req.method} route=${req.originalUrl} ` +
      `key=${keyGenerator(req)} status=${429}`
  );
  res.status(429).json({
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
  });
};

/** Key: per-user when authenticated, per-IP otherwise. */
const authAwareKey = (req) => {
  if (req.user && req.user.id) return `user:${req.user.id}`;
  return `ip:${req.ip}`;
};

/** Create a rateLimit middleware for a named policy. */
const createPolicyLimiter = (policy) => {
  const { policies } = ensureResolved();
  const cfg = policies[policy];
  if (!cfg) throw new Error(`Unknown rate-limit policy "${policy}"`);

  const safeMax = validateMax(cfg.max, policy);
  const keyGenerator = authAwareKey;

  return rateLimitLib({
    windowMs: cfg.windowMs,
    max: safeMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    handler: buildHandler(policy, cfg.windowMs, keyGenerator),
  });
};

/**
 * Public factory. Returns a cached, ready-to-mount middleware for a policy,
 * so a developer can simply drop `rateLimit("read")` into any route.
 */
const rateLimit = (policy) => {
  if (!isEnabled()) return noop;
  if (!limiterCache[policy]) limiterCache[policy] = createPolicyLimiter(policy);
  return limiterCache[policy];
};

/**
 * Global safety-net limiter for the whole /api/v1 tree. Generous upper bound so
 * it absorbs abnormal floods without blocking a normal storefront session.
 */
const createGlobalRateLimit = () => {
  const { policies } = ensureResolved();
  const cfg = policies.global;
  const safeMax = validateMax(cfg.max, 'global');
  const keyGenerator = (req) => `ip:${req.ip}`;

  return rateLimitLib({
    windowMs: cfg.windowMs,
    max: safeMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    handler: buildHandler('global', cfg.windowMs, keyGenerator),
  });
};

let globalLimit = null;
/**
 * Public factory for the global safety-net limiter (applied once in app.js).
 * Call it (e.g. `app.use(API, globalRateLimit())`) when mounting routes.
 */
const globalRateLimit = () => {
  if (!isEnabled()) return noop;
  if (!globalLimit) globalLimit = createGlobalRateLimit();
  return globalLimit;
};

module.exports = { rateLimit, globalRateLimit };
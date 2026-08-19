/**
 * Damini Marketplace - JWT Token Utility
 */

const jwt = require("jsonwebtoken");
const config = require("config");

const ACCESS_SECRET = config.get("jwt.accessSecret");
const REFRESH_SECRET = config.get("jwt.refreshSecret");
const ACCESS_EXPIRY = config.get("jwt.accessExpiry");
const REFRESH_EXPIRY = config.get("jwt.refreshExpiry");
const COOKIE_MAX_AGE = config.get("jwt.cookieMaxAge");

// Parse expiry strings like "2d" into ms for cookie maxAge
const expiryToMs = (expiry) => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return COOKIE_MAX_AGE;
  const val = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return COOKIE_MAX_AGE;
  }
};
const ACCESS_COOKIE_MAX_AGE = expiryToMs(ACCESS_EXPIRY);
const REFRESH_COOKIE_MAX_AGE = expiryToMs(REFRESH_EXPIRY);

/**
 * Generate access token
 * @param {Object} payload - { id, email, role }
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};

const ROLE_COOKIE_PREFIXES = ["admin", "vendor", "customer"];

/**
 * Set auth cookies on response — role-prefixed so multiple apps on the same
 * domain never overwrite each other's sessions.
 * @param {Response} res
 * @param {string} accessToken
 * @param {string} refreshToken
 * @param {string} [role] — "admin" | "vendor" | "customer"
 */
const setAuthCookies = (res, accessToken, refreshToken, role) => {
  const isProduction = config.get("app.env") === "production";
  const prefix = role || "";
  const accessName = prefix ? `${prefix}AccessToken` : "accessToken";
  const refreshName = prefix ? `${prefix}RefreshToken` : "refreshToken";

  res.cookie(accessName, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });

  res.cookie(refreshName, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: "/api/v1/auth/refresh",
  });
};

/**
 * Clear auth cookies — must mirror the options used in setAuthCookies
 * so the browser matches and deletes them (secure/sameSite/path).
 * If role is provided, only clears that role's cookies; otherwise clears all
 * role-prefixed variants plus the legacy unprefixed names.
 */
const clearAuthCookies = (res, role) => {
  const isProduction = config.get("app.env") === "production";
  const clearOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    expires: new Date(0),
  };

  const prefixes = role ? [role] : ROLE_COOKIE_PREFIXES;

  for (const p of prefixes) {
    res.clearCookie(`${p}AccessToken`, { ...clearOptions, path: "/" });
    res.clearCookie(`${p}RefreshToken`, { ...clearOptions, path: "/api/v1/auth/refresh" });
  }

  // Also clear legacy unprefixed names
  res.clearCookie("accessToken", { ...clearOptions, path: "/" });
  res.clearCookie("refreshToken", { ...clearOptions, path: "/api/v1/auth/refresh" });
};

/**
 * Read the access token from role-prefixed cookies.
 * Tries each known prefix in order, then falls back to the legacy name.
 */
const getAccessTokenFromCookies = (cookies) => {
  for (const prefix of ROLE_COOKIE_PREFIXES) {
    if (cookies[`${prefix}AccessToken`]) return cookies[`${prefix}AccessToken`];
  }
  return cookies.accessToken || null;
};

/**
 * Read the refresh token from role-prefixed cookies.
 */
const getRefreshTokenFromCookies = (cookies) => {
  for (const prefix of ROLE_COOKIE_PREFIXES) {
    if (cookies[`${prefix}RefreshToken`]) return cookies[`${prefix}RefreshToken`];
  }
  return cookies.refreshToken || null;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getAccessTokenFromCookies,
  getRefreshTokenFromCookies,
};

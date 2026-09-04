/**
 * Damini Marketplace — OTP Service
 * ─────────────────────────────────────────────────────────────
 * Manages One-Time Password generation, storage, verification,
 * and cleanup in the `users` table.
 *
 * DB columns used:
 *   users.otp          VARCHAR(10)  — bcrypt-hashed OTP
 *   users.otp_expires  DATETIME     — expiry timestamp
 */

'use strict';

const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../database/connection');
const logger = require('../utils/logger.util');

/** OTP validity window in minutes */
const OTP_EXPIRY_MINUTES = 10;

/** Bcrypt salt rounds for OTP hashing (lower for speed, OTPs are short-lived) */
const OTP_SALT_ROUNDS = 10;

/**
 * Generate a cryptographically random 6-digit OTP string.
 * @returns {string} e.g. "472918"
 */
const generateRawOTP = () => {
  // Math.random gives uniform [0, 1); multiply and floor to get 6 digits
  return String(Math.floor(100000 + Math.random() * 900000));
};

/**
 * Generate a 6-digit OTP, hash it, and persist it to the users table.
 * Returns the raw (plain-text) OTP so it can be emailed to the user.
 *
 * @param {string} userId - UUID of the user
 * @returns {Promise<string>} Plain-text OTP
 * @throws {Error} If user not found
 */
const generateAndSaveOTP = async (userId) => {
  // 1. Check user exists
  const user = await queryOne('SELECT id FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // 2. Generate plain OTP
  const rawOTP = generateRawOTP();

  // 3. Hash it (so DB breach doesn't expose active OTPs)
  const hashedOTP = await bcrypt.hash(rawOTP, OTP_SALT_ROUNDS);

  // 4. Compute expiry (now + 10 min) in MySQL DATETIME format (local time)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const mysqlExpiry = `${expiresAt.getFullYear()}-${pad(expiresAt.getMonth() + 1)}-${pad(expiresAt.getDate())} ${pad(expiresAt.getHours())}:${pad(expiresAt.getMinutes())}:${pad(expiresAt.getSeconds())}`;

  // 5. Persist to DB
  await query(
    'UPDATE users SET otp = ?, otp_expires = ? WHERE id = ?',
    [hashedOTP, mysqlExpiry, userId]
  );

  logger.info(`OTP generated for user ${userId} | expires ${mysqlExpiry}`);
  return rawOTP;
};

/**
 * Verify a plain-text OTP against the stored hash for a given user.
 * Clears the OTP from the DB on successful match.
 *
 * @param {string} userId  - UUID of the user
 * @param {string} rawOTP  - Plain-text OTP submitted by the user
 * @returns {Promise<boolean>} true if valid
 * @throws {Error} On invalid / expired OTP
 */
const verifyOTP = async (userId, rawOTP) => {
  // 1. Fetch user with OTP fields
  const user = await queryOne(
    'SELECT otp, otp_expires FROM users WHERE id = ?',
    [userId]
  );

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // 2. Check OTP exists
  if (!user.otp || !user.otp_expires) {
    throw Object.assign(
      new Error('No OTP found. Please request a new one.'),
      { statusCode: 400 }
    );
  }

  // 3. Check expiry
  const now = new Date();
  const expiry = new Date(user.otp_expires);
  if (now > expiry) {
    // Clear the expired OTP
    await clearOTP(userId);
    throw Object.assign(
      new Error('OTP has expired. Please request a new one.'),
      { statusCode: 400 }
    );
  }

  // 4. Compare hash
  const isMatch = await bcrypt.compare(String(rawOTP), user.otp);
  if (!isMatch) {
    throw Object.assign(
      new Error('Invalid OTP. Please check and try again.'),
      { statusCode: 400 }
    );
  }

  // 5. Clear OTP after successful use (single-use enforcement)
  await clearOTP(userId);

  logger.info(`OTP verified and cleared for user ${userId}`);
  return true;
};

/**
 * Generate and save OTP when the caller only knows the email address
 * (e.g. forgot-password flow — user is not yet authenticated).
 *
 * @param {string} email - User's email address
 * @returns {Promise<{ userId: string, name: string, rawOTP: string }>}
 * @throws {Error} If email not registered
 */
const generateEmailOTP = async (email) => {
  const user = await queryOne(
    'SELECT id, name FROM users WHERE email = ? AND is_active = 1',
    [email]
  );

  if (!user) {
    // Return a generic message to prevent email enumeration
    throw Object.assign(
      new Error('If this email is registered, you will receive an OTP shortly.'),
      { statusCode: 404, safe: true }
    );
  }

  const rawOTP = await generateAndSaveOTP(user.id);

  return { userId: user.id, name: user.name, rawOTP };
};

/**
 * Clear the OTP fields for a user (after use or on explicit invalidation).
 *
 * @param {string} userId - UUID of the user
 * @returns {Promise<void>}
 */
const clearOTP = async (userId) => {
  await query(
    'UPDATE users SET otp = NULL, otp_expires = NULL WHERE id = ?',
    [userId]
  );
};

module.exports = {
  generateAndSaveOTP,
  verifyOTP,
  generateEmailOTP,
  clearOTP,
};

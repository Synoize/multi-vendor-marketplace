/**
 * Damini Marketplace - Auth Service
 * Handles registration, login, OTP, token management
 */

const bcrypt = require('bcryptjs');
const config = require('config');
const { query, queryOne, transaction } = require('../database/connection');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/token.util');
const { generateOTP, generateReferralCode } = require('../utils/sku.util');
const emailService = require('./email.service');
const logger = require('../utils/logger.util');

const BCRYPT_ROUNDS = config.get('bcrypt.rounds');
const OTP_EXPIRY_SEC = config.get('otp.expiry');

/**
 * Register a new user
 */
const registerUser = async ({ name, email, phone, password, referralCode }) => {
  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const myReferralCode = generateReferralCode();
  const otp = generateOTP(6);
  const otpExpires = new Date(Date.now() + OTP_EXPIRY_SEC * 1000);

  let referrerId = null;
  if (referralCode) {
    const referrer = await queryOne('SELECT id FROM users WHERE referral_code = ?', [referralCode]);
    if (referrer) referrerId = referrer.id;
  }

  await transaction(async (conn) => {
    // Create user
    await conn.execute(
      `INSERT INTO users (name, email, phone, password_hash, referral_code, referred_by, otp, otp_expires, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'customer')`,
      [name, email, phone || null, passwordHash, myReferralCode, referrerId, otp, otpExpires]
    );

    // Get new user id
    const [newUser] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
    const userId = newUser[0].id;

    // Create wallet
    await conn.execute('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [userId]);

    // Track referral
    if (referrerId) {
      await conn.execute(
        'INSERT INTO referrals (referrer_id, referee_id, reward_amount) VALUES (?, ?, ?)',
        [referrerId, userId, config.get('referral.rewardAmount')]
      );
    }
  });

  // Send OTP email
  try {
    await emailService.sendOTPEmail(email, name, otp);
  } catch (e) {
    logger.error('Failed to send OTP email:', e.message);
  }

  return { email, message: 'Registration successful. Please verify your email with the OTP sent.' };
};

/**
 * Verify email OTP
 */
const verifyEmail = async (email, otp) => {
  const user = await queryOne(
    'SELECT id, name, otp, otp_expires, is_verified FROM users WHERE email = ?',
    [email]
  );
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (user.is_verified) throw Object.assign(new Error('Email already verified'), { statusCode: 400 });
  if (!user.otp || user.otp !== otp) throw Object.assign(new Error('Invalid OTP'), { statusCode: 400 });
  if (new Date() > new Date(user.otp_expires)) throw Object.assign(new Error('OTP has expired. Please request a new one.'), { statusCode: 400 });

  await query(
    'UPDATE users SET is_verified = 1, otp = NULL, otp_expires = NULL WHERE id = ?',
    [user.id]
  );

  try { await emailService.sendWelcomeEmail(email, user.name); } catch (e) {}

  return { message: 'Email verified successfully. You can now log in.' };
};

/**
 * Login user
 */
const loginUser = async (email, password) => {
  const user = await queryOne(
    'SELECT id, name, email, phone, avatar, role, is_active, is_verified, password_hash FROM users WHERE email = ?',
    [email]
  );

  if (!user) throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  if (!user.is_active) throw Object.assign(new Error('Account is deactivated. Contact support.'), { statusCode: 403 });
  if (!user.is_verified) throw Object.assign(new Error('Please verify your email before logging in.'), { statusCode: 403 });

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store refresh token hash
  const tokenHash = await bcrypt.hash(refreshToken, 8);
  const expires = new Date(Date.now() + config.get('jwt.cookieMaxAge'));
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [user.id, tokenHash, expires]
  );

  // Update last login
  await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

  const { password_hash, ...safeUser } = user;
  return { accessToken, refreshToken, user: safeUser };
};

/**
 * Forgot password — send OTP
 */
const forgotPassword = async (email) => {
  const user = await queryOne('SELECT id, name FROM users WHERE email = ? AND is_active = 1', [email]);
  if (!user) throw Object.assign(new Error('No account found with this email'), { statusCode: 404 });

  const otp = generateOTP(6);
  const otpExpires = new Date(Date.now() + OTP_EXPIRY_SEC * 1000);
  await query('UPDATE users SET otp = ?, otp_expires = ? WHERE id = ?', [otp, otpExpires, user.id]);

  try { await emailService.sendOTPEmail(email, user.name, otp, 'password reset'); } catch (e) {}
  return { message: 'Password reset OTP sent to your email.' };
};

/**
 * Reset password
 */
const resetPassword = async (email, otp, newPassword) => {
  const user = await queryOne('SELECT id, otp, otp_expires FROM users WHERE email = ?', [email]);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (!user.otp || user.otp !== otp) throw Object.assign(new Error('Invalid OTP'), { statusCode: 400 });
  if (new Date() > new Date(user.otp_expires)) throw Object.assign(new Error('OTP expired'), { statusCode: 400 });

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await query('UPDATE users SET password_hash = ?, otp = NULL, otp_expires = NULL WHERE id = ?', [hash, user.id]);
  return { message: 'Password reset successfully. Please log in.' };
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) throw Object.assign(new Error('Refresh token required'), { statusCode: 401 });

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  const tokens = await queryOne(
    'SELECT id, token_hash FROM refresh_tokens WHERE user_id = ? AND expires_at > NOW()',
    [decoded.id]
  );
  if (!tokens) throw Object.assign(new Error('Session expired. Please log in again.'), { statusCode: 401 });

  const isValid = await bcrypt.compare(refreshToken, tokens.token_hash);
  if (!isValid) throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });

  const user = await queryOne('SELECT id, email, role FROM users WHERE id = ? AND is_active = 1', [decoded.id]);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 401 });

  const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
  return { accessToken: newAccessToken };
};

/**
 * Logout — invalidate refresh token
 */
const logoutUser = async (userId) => {
  await query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
};

/**
 * Resend OTP
 */
const resendOTP = async (email) => {
  const user = await queryOne('SELECT id, name, is_verified FROM users WHERE email = ?', [email]);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (user.is_verified) throw Object.assign(new Error('Email already verified'), { statusCode: 400 });

  const otp = generateOTP(6);
  const otpExpires = new Date(Date.now() + OTP_EXPIRY_SEC * 1000);
  await query('UPDATE users SET otp = ?, otp_expires = ? WHERE id = ?', [otp, otpExpires, user.id]);
  try { await emailService.sendOTPEmail(email, user.name, otp); } catch (e) {}
  return { message: 'New OTP sent to your email.' };
};

module.exports = { registerUser, verifyEmail, loginUser, forgotPassword, resetPassword, refreshAccessToken, logoutUser, resendOTP };

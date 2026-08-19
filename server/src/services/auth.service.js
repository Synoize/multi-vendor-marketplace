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

// Parse expiry string to ms for refresh_tokens.expires_at
const expiryToMs = (expiry) => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 2 * 24 * 60 * 60 * 1000;
  const val = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return 2 * 24 * 60 * 60 * 1000;
  }
};
const REFRESH_EXPIRY_MS = expiryToMs(config.get('jwt.refreshExpiry'));

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
 * Verify email OTP and directly log in
 */
const verifyEmail = async (email, otp) => {
  const user = await queryOne(
    'SELECT id, name, email, phone, avatar, role, otp, otp_expires, is_active, is_verified, referral_code FROM users WHERE email = ?',
    [email]
  );
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (!user.is_active) throw Object.assign(new Error('Account is deactivated. Contact support.'), { statusCode: 403 });
  if (!user.otp || String(user.otp) !== String(otp)) throw Object.assign(new Error('Invalid OTP'), { statusCode: 400 });
  if (new Date() > new Date(user.otp_expires)) throw Object.assign(new Error('OTP has expired. Please request a new one.'), { statusCode: 400 });

  await query(
    'UPDATE users SET is_verified = 1, otp = NULL, otp_expires = NULL WHERE id = ?',
    [user.id]
  );

  if (!user.is_verified) {
    try { await emailService.sendWelcomeEmail(email, user.name); } catch (e) {}
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const tokenHash = await bcrypt.hash(refreshToken, 8);
  const expires = new Date(Date.now() + REFRESH_EXPIRY_MS);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [user.id, tokenHash, expires]
  );

  await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      is_verified: user.is_verified,
      referral_code: user.referral_code,
    },
    message: 'Login successful',
  };
};

/**
 * Login user (Send OTP if password absent, authenticate directly if password present)
 */
const loginUser = async (email, password) => {
  let user = await queryOne('SELECT id, name, email, phone, avatar, role, is_active, is_verified, referral_code, password_hash FROM users WHERE email = ?', [email]);
  
  if (!user) {
    if (password) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }
    
    // Automatically register new user for passwordless
    const name = email.split('@')[0];
    const passwordHash = await bcrypt.hash(Math.random().toString(36), BCRYPT_ROUNDS);
    const myReferralCode = generateReferralCode();
    
    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO users (name, email, password_hash, referral_code, role, is_verified)
         VALUES (?, ?, ?, ?, 'customer', 0)`,
        [name, email, passwordHash, myReferralCode]
      );
      
      const [newUser] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
      const userId = newUser[0].id;
      await conn.execute('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [userId]);
    });
    
    user = await queryOne('SELECT id, name, email, phone, avatar, role, is_active, is_verified, referral_code, password_hash FROM users WHERE email = ?', [email]);
  }

  if (!user.is_active) throw Object.assign(new Error('Account is deactivated. Contact support.'), { statusCode: 403 });

  // Vendors use OTP-only login via the vendor portal (registered + approved only)
  if (user.role === 'vendor') {
    throw Object.assign(
      new Error('Vendor login requires OTP verification through the vendor portal.'),
      { statusCode: 403 }
    );
  }

  // If password is provided, do direct password authentication (for admin panel)
  if (password) {
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const tokenHash = await bcrypt.hash(refreshToken, 8);
    const expires = new Date(Date.now() + REFRESH_EXPIRY_MS);
    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, tokenHash, expires]
    );

    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        is_verified: user.is_verified,
        referral_code: user.referral_code,
      },
      directLogin: true,
    };
  }

  // Passwordless OTP generation
  const otp = generateOTP(6);
  const otpExpires = new Date(Date.now() + OTP_EXPIRY_SEC * 1000);
  await query('UPDATE users SET otp = ?, otp_expires = ? WHERE id = ?', [otp, otpExpires, user.id]);

  logger.info(`🔑 OTP for ${email} is: ${otp}`);

  try {
    await emailService.sendOTPEmail(email, user.name, otp);
  } catch (e) {
    logger.error('Failed to send OTP email:', e.message);
  }

  return { email, message: 'OTP sent to your email.' };
};

/**
 * Request login OTP for an approved vendor
 */
const requestVendorOtp = async (email) => {
  const vendor = await queryOne(
    `SELECT u.id, u.name, u.email, u.role, u.is_active,
            v.kyc_status, v.is_active as vendor_active
     FROM users u
     JOIN vendors v ON v.user_id = u.id
     WHERE u.email = ?`,
    [email]
  );

  if (!vendor) throw Object.assign(new Error('No vendor account found with this email.'), { statusCode: 404 });
  if (!vendor.is_active || !vendor.vendor_active) throw Object.assign(new Error('Account is deactivated. Contact support.'), { statusCode: 403 });
  if (vendor.kyc_status === 'pending') {
    throw Object.assign(
      new Error('Your vendor application is under review. You will be able to log in once approved.'),
      { statusCode: 403 }
    );
  }
  if (vendor.kyc_status === 'rejected') {
    throw Object.assign(
      new Error('Your vendor application was rejected. Please contact support for details.'),
      { statusCode: 403 }
    );
  }
  if (vendor.role !== 'vendor') throw Object.assign(new Error('Access denied. This portal is for vendors only.'), { statusCode: 403 });
  if (vendor.kyc_status !== 'approved') {
    throw Object.assign(
      new Error(`Your vendor account has not been approved yet. Current status: ${vendor.kyc_status}. Please contact support.`),
      { statusCode: 403 }
    );
  }

  const otp = generateOTP(6);
  const otpExpires = new Date(Date.now() + OTP_EXPIRY_SEC * 1000);
  await query('UPDATE users SET otp = ?, otp_expires = ? WHERE id = ?', [otp, otpExpires, vendor.id]);

  logger.info(`🔑 Vendor OTP for ${email} is: ${otp}`);

  try {
    await emailService.sendOTPEmail(email, vendor.name, otp);
  } catch (e) {
    logger.error('Failed to send OTP email:', e.message);
  }

  return { email, message: 'OTP sent to your email. Please verify to continue.' };
};

/**
 * Verify vendor login OTP and issue tokens
 */
const verifyVendorOtp = async (email, otp) => {
  const vendor = await queryOne(
    `SELECT u.id, u.name, u.email, u.role, u.otp, u.otp_expires, u.is_active,
            v.kyc_status, v.is_active as vendor_active, v.store_name
     FROM users u
     JOIN vendors v ON v.user_id = u.id
     WHERE u.email = ?`,
    [email]
  );

  if (!vendor) throw Object.assign(new Error('No vendor account found with this email.'), { statusCode: 404 });
  if (!vendor.is_active || !vendor.vendor_active) throw Object.assign(new Error('Account is deactivated. Contact support.'), { statusCode: 403 });
  if (vendor.kyc_status === 'pending') {
    throw Object.assign(
      new Error('Your vendor application is under review. You will be able to log in once approved.'),
      { statusCode: 403 }
    );
  }
  if (vendor.kyc_status === 'rejected') {
    throw Object.assign(
      new Error('Your vendor application was rejected. Please contact support for details.'),
      { statusCode: 403 }
    );
  }
  if (vendor.role !== 'vendor') throw Object.assign(new Error('Access denied. This portal is for vendors only.'), { statusCode: 403 });
  if (vendor.kyc_status !== 'approved') {
    throw Object.assign(
      new Error(`Your vendor account has not been approved yet. Current status: ${vendor.kyc_status}. Please contact support.`),
      { statusCode: 403 }
    );
  }
  if (!vendor.otp || String(vendor.otp) !== String(otp)) throw Object.assign(new Error('Invalid OTP'), { statusCode: 400 });
  if (new Date() > new Date(vendor.otp_expires)) throw Object.assign(new Error('OTP has expired. Please request a new one.'), { statusCode: 400 });

  await query('UPDATE users SET is_verified = 1, otp = NULL, otp_expires = NULL WHERE id = ?', [vendor.id]);

  const payload = { id: vendor.id, email: vendor.email, role: vendor.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const tokenHash = await bcrypt.hash(refreshToken, 8);
  const expires = new Date(Date.now() + REFRESH_EXPIRY_MS);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [vendor.id, tokenHash, expires]
  );

  await query('UPDATE users SET last_login = NOW() WHERE id = ?', [vendor.id]);

  return {
    accessToken,
    refreshToken,
    user: { id: vendor.id, name: vendor.name, email: vendor.email, role: vendor.role, store_name: vendor.store_name },
    message: 'Login successful',
  };
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
  if (!user.otp || String(user.otp) !== String(otp)) throw Object.assign(new Error('Invalid OTP'), { statusCode: 400 });
  if (new Date() > new Date(user.otp_expires)) throw Object.assign(new Error('OTP expired'), { statusCode: 400 });

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await query('UPDATE users SET password_hash = ?, otp = NULL, otp_expires = NULL WHERE id = ?', [hash, user.id]);
  return { message: 'Password reset successfully. Please log in.' };
};

/**
 * Refresh access token using refresh token (also rotates refresh token)
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

  // Block role changes mid-session — a token issued for one account type
  // (customer/vendor/admin) must not be able to mint tokens for another.
  if (decoded.role !== user.role) {
    throw Object.assign(new Error('Your account type changed. Please log in again.'), { statusCode: 401 });
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  // Rotate: replace old refresh token hash in DB
  const tokenHash = await bcrypt.hash(newRefreshToken, 8);
  const expires = new Date(Date.now() + REFRESH_EXPIRY_MS);
  await query(
    'UPDATE refresh_tokens SET token_hash = ?, expires_at = ? WHERE id = ?',
    [tokenHash, expires, tokens.id]
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, role: user.role };
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
  logger.info(`🔑 OTP for ${email} is: ${otp}`);
  try { await emailService.sendOTPEmail(email, user.name, otp); } catch (e) {}
  return { message: 'New OTP sent to your email.' };
};

module.exports = { registerUser, verifyEmail, loginUser, requestVendorOtp, verifyVendorOtp, forgotPassword, resetPassword, refreshAccessToken, logoutUser, resendOTP };

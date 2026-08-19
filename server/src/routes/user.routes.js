/**
 * Damini Marketplace - User Routes, Controller, Service
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendError } = require('../utils/response.util');
const { query, queryOne, queryRows } = require('../database/connection');
const { uploadAvatar } = require('../middlewares/upload.middleware');
const { generateReferralCode } = require('../utils/sku.util');

const router = express.Router();

/**
 * GET /users/me/profile
 * Get current user profile
 */
router.get('/me/profile', protect, asyncHandler(async (req, res) => {
  const user = await queryOne(
    `SELECT id, name, email, phone, avatar, role, is_verified, referral_code, created_at,
     (SELECT balance FROM wallets WHERE user_id = users.id) as wallet_balance
     FROM users WHERE id = ?`,
    [req.user.id]
  );
  sendSuccess(res, user);
}));

/**
 * PUT /users/me/profile
 * Update profile info
 */
router.put('/me/profile', protect, asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  await query(
    'UPDATE users SET name = ?, phone = ?, updated_at = NOW() WHERE id = ?',
    [name, phone, req.user.id]
  );
  const user = await queryOne(
    'SELECT id, name, email, phone, avatar, role, is_verified, referral_code, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  sendSuccess(res, user, 'Profile updated successfully');
}));

/**
 * POST /users/me/avatar
 * Upload avatar
 */
router.post('/me/avatar', protect, uploadAvatar, asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, 'No file uploaded', 400);
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  await query('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, req.user.id]);
  sendSuccess(res, { avatar: avatarUrl }, 'Avatar updated');
}));

/**
 * GET /users/me/addresses
 */
router.get('/me/addresses', protect, asyncHandler(async (req, res) => {
  const addresses = await queryRows(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
    [req.user.id]
  );
  sendSuccess(res, addresses);
}));

/**
 * POST /users/me/addresses
 */
router.post('/me/addresses', protect, asyncHandler(async (req, res) => {
  const { name, phone, email, line1, line2, landmark, city, state, pincode, country, type, is_default } = req.body;
  
  // If setting as default, unset previous default
  if (is_default) {
    await query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
  }

  await query(
    `INSERT INTO addresses (user_id, name, phone, email, line1, line2, landmark, city, state, pincode, country, type, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, name, phone, email || null, line1, line2 || null, landmark || null, city, state, pincode, country || 'India', type || 'home', is_default ? 1 : 0]
  );
  sendSuccess(res, null, 'Address added successfully');
}));

/**
 * PUT /users/me/addresses/:id
 */
router.put('/me/addresses/:id', protect, asyncHandler(async (req, res) => {
  // Verify ownership and load existing row so partial updates (e.g. setting
  // default) don't wipe the other fields with undefined bind params.
  const addr = await queryOne('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!addr) return sendError(res, 'Address not found', 404);

  const b = req.body;
  const merged = {
    name: b.name ?? addr.name,
    phone: b.phone ?? addr.phone,
    email: b.email ?? addr.email,
    line1: b.line1 ?? addr.line1,
    line2: b.line2 ?? addr.line2,
    landmark: b.landmark ?? addr.landmark,
    city: b.city ?? addr.city,
    state: b.state ?? addr.state,
    pincode: b.pincode ?? addr.pincode,
    country: b.country ?? addr.country,
    type: b.type ?? addr.type,
    is_default: b.is_default ?? !!addr.is_default,
  };

  if (merged.is_default) {
    await query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
  }

  await query(
    `UPDATE addresses SET name=?, phone=?, email=?, line1=?, line2=?, landmark=?, city=?, state=?, pincode=?, 
     country=?, type=?, is_default=? WHERE id = ? AND user_id = ?`,
    [merged.name, merged.phone, merged.email, merged.line1, merged.line2, merged.landmark, merged.city,
     merged.state, merged.pincode, merged.country, merged.type, merged.is_default ? 1 : 0, req.params.id, req.user.id]
  );
  sendSuccess(res, null, 'Address updated');
}));

/**
 * DELETE /users/me/addresses/:id
 */
router.delete('/me/addresses/:id', protect, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (result[0].affectedRows === 0) return sendError(res, 'Address not found', 404);
  sendSuccess(res, null, 'Address deleted');
}));

/**
 * GET /users/me/wallet
 */
router.get('/me/wallet', protect, asyncHandler(async (req, res) => {
  const wallet = await queryOne('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
  const transactions = await queryRows(
    'SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [req.user.id]
  );
  sendSuccess(res, { wallet, transactions });
}));

/**
 * GET /users/me/referral
 */
router.get('/me/referral', protect, asyncHandler(async (req, res) => {
  const user = await queryOne('SELECT referral_code FROM users WHERE id = ?', [req.user.id]);
  
  let referralCode = user.referral_code;
  if (!referralCode) {
    referralCode = generateReferralCode();
    await query('UPDATE users SET referral_code = ? WHERE id = ?', [referralCode, req.user.id]);
  }

  const stats = await queryOne(
    `SELECT 
      COUNT(*) as total_referrals,
      SUM(CASE WHEN status = 'credited' THEN reward_amount ELSE 0 END) as total_earned,
      SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END) as pending
     FROM referrals WHERE referrer_id = ?`,
    [req.user.id]
  );

  sendSuccess(res, { referralCode, stats });
}));

/**
 * DELETE /users/me
 * Delete own account
 */
router.delete('/me', protect, asyncHandler(async (req, res) => {
  await query('UPDATE users SET is_active = 0, email = CONCAT("deleted_", id, "_", email) WHERE id = ?', [req.user.id]);
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  sendSuccess(res, null, 'Account deleted successfully');
}));

module.exports = router;

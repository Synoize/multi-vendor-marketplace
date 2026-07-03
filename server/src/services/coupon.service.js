/**
 * Damini Marketplace - Coupon Service
 * Validate, apply, and manage discount coupons.
 */

'use strict';

const { query, queryRows, queryOne, transaction } = require('../database/connection');
const { getPagination } = require('../utils/pagination.util');
const logger = require('../utils/logger.util');

// ─────────────────────────────────────────────────────────────────────────────
// validateCoupon
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Validate a coupon code for a user and cart total. Returns discount details.
 *
 * @param {string} code - Coupon code (case-insensitive)
 * @param {string} userId
 * @param {number} cartTotal - Cart subtotal before discount
 * @returns {Promise<{ coupon, discountAmount, finalTotal }>}
 * @throws Descriptive errors for each failure case
 */
async function validateCoupon(code, userId, cartTotal) {
  try {
    const coupon = await queryOne(
      `SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1`,
      [code.trim()]
    );

    if (!coupon) throw Object.assign(new Error('Invalid coupon code'), { statusCode: 400 });

    const now = new Date();
    if (now < new Date(coupon.valid_from)) {
      throw Object.assign(new Error('Coupon is not yet active'), { statusCode: 400 });
    }
    if (now > new Date(coupon.valid_to)) {
      throw Object.assign(new Error('Coupon has expired'), { statusCode: 400 });
    }
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      throw Object.assign(new Error('Coupon has reached its usage limit'), { statusCode: 400 });
    }
    if (coupon.min_order_amount !== null && cartTotal < parseFloat(coupon.min_order_amount)) {
      throw Object.assign(
        new Error(`Minimum order amount of ₹${coupon.min_order_amount} required for this coupon`),
        { statusCode: 400 }
      );
    }

    // Check per-user usage
    const [usageRow] = await queryRows(
      `SELECT COUNT(*) AS used FROM orders
       WHERE coupon_id = ? AND user_id = ? AND status NOT IN ('cancelled')`,
      [coupon.id, userId]
    );
    const userUsed = parseInt(usageRow.used, 10);
    if (userUsed >= coupon.max_uses_per_user) {
      throw Object.assign(
        new Error(`You have already used this coupon ${coupon.max_uses_per_user} time(s)`),
        { statusCode: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (cartTotal * parseFloat(coupon.discount_value)) / 100;
      if (coupon.max_discount !== null) {
        discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount));
      }
    } else if (coupon.type === 'fixed') {
      discountAmount = Math.min(parseFloat(coupon.discount_value), cartTotal);
    } else if (coupon.type === 'free_shipping') {
      // Shipping discount handled at order level; return 0 here but flag it
      discountAmount = 0;
    }

    discountAmount = parseFloat(discountAmount.toFixed(2));
    const finalTotal = parseFloat((cartTotal - discountAmount).toFixed(2));

    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        type: coupon.type,
        discountValue: parseFloat(coupon.discount_value),
        maxDiscount: coupon.max_discount ? parseFloat(coupon.max_discount) : null,
        isFreeShipping: coupon.type === 'free_shipping',
      },
      discountAmount,
      finalTotal,
    };
  } catch (err) {
    logger.error('CouponService.validateCoupon error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// applyCoupon
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Validate and return coupon for use during order creation.
 * Does NOT increment used_count here — that happens when order is confirmed.
 *
 * @param {string} code
 * @param {string} userId
 * @param {number} cartTotal
 * @returns {Promise<{ couponId, discountAmount, isFreeShipping }>}
 */
async function applyCoupon(code, userId, cartTotal) {
  try {
    const result = await validateCoupon(code, userId, cartTotal);
    return {
      couponId: result.coupon.id,
      discountAmount: result.discountAmount,
      isFreeShipping: result.coupon.isFreeShipping,
      couponDetails: result.coupon,
    };
  } catch (err) {
    logger.error('CouponService.applyCoupon error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getCoupons  (admin)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Get all coupons with optional filters (admin use).
 *
 * @param {Object} queryParams - page, limit, status, type, search
 * @returns {Promise<{ items, total, page, limit }>}
 */
async function getCoupons(queryParams = {}) {
  try {
    const { page, limit, offset } = getPagination(queryParams, 20);
    const { status, type, search } = queryParams;

    const conditions = [];
    const params = [];

    if (status === 'active') conditions.push('is_active = 1');
    else if (status === 'inactive') conditions.push('is_active = 0');

    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }
    if (search) {
      conditions.push('(code LIKE ? OR title LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRow] = await queryRows(
      `SELECT COUNT(*) AS total FROM coupons ${whereClause}`,
      params
    );
    const total = parseInt(countRow.total, 10);

    const items = await queryRows(
      `SELECT c.*, v.store_name AS vendor_store
       FROM coupons c
       LEFT JOIN vendors v ON v.id = c.vendor_id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { items, total, page, limit };
  } catch (err) {
    logger.error('CouponService.getCoupons error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createCoupon  (admin)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Create a new coupon (admin only).
 *
 * @param {Object} data - Coupon fields from validated request
 * @returns {Promise<Object>} Created coupon
 */
async function createCoupon(data) {
  try {
    const {
      code,
      title,
      description = null,
      type,
      discount_value,
      max_discount = null,
      min_order_amount = null,
      max_uses = null,
      max_uses_per_user = 1,
      applicable_to = 'all',
      applicable_id = null,
      vendor_id = null,
      valid_from,
      valid_to,
      is_festival = 0,
    } = data;

    // Ensure code is unique
    const existing = await queryOne(`SELECT id FROM coupons WHERE UPPER(code) = UPPER(?)`, [code]);
    if (existing) throw Object.assign(new Error('Coupon code already exists'), { statusCode: 409 });

    await query(
      `INSERT INTO coupons
         (code, title, description, type, discount_value, max_discount, min_order_amount,
          max_uses, max_uses_per_user, applicable_to, applicable_id, vendor_id,
          valid_from, valid_to, is_festival, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        code.toUpperCase(), title, description, type, discount_value, max_discount,
        min_order_amount, max_uses, max_uses_per_user, applicable_to, applicable_id,
        vendor_id, valid_from, valid_to, is_festival ? 1 : 0,
      ]
    );

    const coupon = await queryOne(
      `SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)`,
      [code]
    );
    return coupon;
  } catch (err) {
    logger.error('CouponService.createCoupon error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateCoupon  (admin)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Update an existing coupon (admin only).
 *
 * @param {number} id - Coupon ID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated coupon
 */
async function updateCoupon(id, data) {
  try {
    const coupon = await queryOne(`SELECT id FROM coupons WHERE id = ?`, [id]);
    if (!coupon) throw Object.assign(new Error('Coupon not found'), { statusCode: 404 });

    const allowed = [
      'title', 'description', 'type', 'discount_value', 'max_discount',
      'min_order_amount', 'max_uses', 'max_uses_per_user', 'applicable_to',
      'applicable_id', 'vendor_id', 'valid_from', 'valid_to', 'is_active', 'is_festival',
    ];

    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (key in data) {
        updates.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (!updates.length) throw Object.assign(new Error('No valid fields to update'), { statusCode: 400 });

    values.push(id);
    await query(`UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`, values);
    return queryOne(`SELECT * FROM coupons WHERE id = ?`, [id]);
  } catch (err) {
    logger.error('CouponService.updateCoupon error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteCoupon  (admin)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Soft-delete a coupon by setting is_active = 0.
 *
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function deleteCoupon(id) {
  try {
    const [result] = await query(
      `UPDATE coupons SET is_active = 0 WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      throw Object.assign(new Error('Coupon not found'), { statusCode: 404 });
    }
    return true;
  } catch (err) {
    logger.error('CouponService.deleteCoupon error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getUserCoupons
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Get all active, valid coupons available to a user (not yet exhausted by the user).
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getUserCoupons(userId) {
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const coupons = await queryRows(
      `SELECT
         c.id, c.code, c.title, c.description, c.type,
         c.discount_value, c.max_discount, c.min_order_amount,
         c.max_uses_per_user, c.valid_to, c.is_festival,
         (
           SELECT COUNT(*) FROM orders o
           WHERE o.coupon_id = c.id AND o.user_id = ? AND o.status NOT IN ('cancelled')
         ) AS user_used_count
       FROM coupons c
       WHERE c.is_active = 1
         AND c.valid_from <= ?
         AND c.valid_to   >= ?
         AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
         AND (c.applicable_to = 'all')
       ORDER BY c.is_festival DESC, c.discount_value DESC`,
      [userId, now, now]
    );

    // Filter out coupons the user has exhausted their limit on
    const available = coupons.filter(
      (c) => parseInt(c.user_used_count, 10) < c.max_uses_per_user
    );

    return available.map((c) => ({
      ...c,
      discount_value: parseFloat(c.discount_value),
      max_discount: c.max_discount ? parseFloat(c.max_discount) : null,
      min_order_amount: c.min_order_amount ? parseFloat(c.min_order_amount) : null,
      user_used_count: parseInt(c.user_used_count, 10),
    }));
  } catch (err) {
    logger.error('CouponService.getUserCoupons error:', err);
    throw err;
  }
}

module.exports = {
  validateCoupon,
  applyCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getUserCoupons,
};

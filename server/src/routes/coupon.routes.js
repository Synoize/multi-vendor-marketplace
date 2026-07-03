/**
 * Damini Marketplace - Coupon Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated } = require('../utils/response.util');
const couponService = require('../services/coupon.service');

const router = express.Router();

/** POST /coupons/validate — check coupon validity */
router.post('/validate', protect, asyncHandler(async (req, res) => {
  const { code, cartTotal } = req.body;
  const result = await couponService.validateCoupon(code, req.user.id, cartTotal);
  sendSuccess(res, result);
}));

/** GET /coupons/available — available coupons for user */
router.get('/available', protect, asyncHandler(async (req, res) => {
  const coupons = await couponService.getUserCoupons(req.user.id);
  sendSuccess(res, coupons);
}));

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  const coupons = await couponService.getCoupons(req.query);
  sendSuccess(res, coupons);
}));

router.post('/', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await couponService.createCoupon(req.body);
  sendCreated(res, null, 'Coupon created');
}));

router.put('/:id', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await couponService.updateCoupon(req.params.id, req.body);
  sendSuccess(res, null, 'Coupon updated');
}));

router.delete('/:id', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await couponService.deleteCoupon(req.params.id);
  sendSuccess(res, null, 'Coupon deleted');
}));

router.patch('/:id/toggle', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  const { query, queryOne } = require('../database/connection');
  const coupon = await queryOne('SELECT is_active FROM coupons WHERE id = ?', [req.params.id]);
  if (!coupon) return sendSuccess(res, null, 'Coupon not found');
  await query('UPDATE coupons SET is_active = ? WHERE id = ?', [coupon.is_active ? 0 : 1, req.params.id]);
  sendSuccess(res, null, 'Coupon status toggled');
}));

module.exports = router;

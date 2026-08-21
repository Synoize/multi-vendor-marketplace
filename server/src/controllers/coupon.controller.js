/**
 * Damini Marketplace - Coupon Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated } = require('../utils/response.util');
const { query, queryOne } = require('../database/connection');
const couponService = require('../services/coupon.service');

/** POST /coupons/validate — check coupon validity */
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, cartTotal } = req.body;
  const result = await couponService.validateCoupon(code, req.user.id, cartTotal);
  sendSuccess(res, result);
});

/** GET /coupons/available — available coupons for user */
const getAvailableCoupons = asyncHandler(async (req, res) => {
  const coupons = await couponService.getUserCoupons(req.user.id);
  sendSuccess(res, coupons);
});

/** GET /coupons — admin */
const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await couponService.getCoupons(req.query);
  sendSuccess(res, coupons);
});

/** POST /coupons — admin */
const createCoupon = asyncHandler(async (req, res) => {
  await couponService.createCoupon(req.body);
  sendCreated(res, null, 'Coupon created');
});

/** PUT /coupons/:id — admin */
const updateCoupon = asyncHandler(async (req, res) => {
  await couponService.updateCoupon(req.params.id, req.body);
  sendSuccess(res, null, 'Coupon updated');
});

/** DELETE /coupons/:id — admin */
const deleteCoupon = asyncHandler(async (req, res) => {
  await couponService.deleteCoupon(req.params.id);
  sendSuccess(res, null, 'Coupon deleted');
});

/** PATCH /coupons/:id/toggle — admin */
const toggleCoupon = asyncHandler(async (req, res) => {
  const coupon = await queryOne('SELECT is_active FROM coupons WHERE id = ?', [req.params.id]);
  if (!coupon) return sendSuccess(res, null, 'Coupon not found');
  await query('UPDATE coupons SET is_active = ? WHERE id = ?', [coupon.is_active ? 0 : 1, req.params.id]);
  sendSuccess(res, null, 'Coupon status toggled');
});

module.exports = {
  validateCoupon,
  getAvailableCoupons,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCoupon,
};

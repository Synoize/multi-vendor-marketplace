/**
 * Damini Marketplace - Coupon Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const couponController = require('../controllers/coupon.controller');

const router = express.Router();

/** POST /coupons/validate — check coupon validity */
router.post('/validate', protect, rateLimit('coupon'), couponController.validateCoupon);

/** GET /coupons/available — available coupons for user */
router.get('/available', protect, rateLimit('read'), couponController.getAvailableCoupons);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/', protect, requireRole('admin'), rateLimit('admin'), couponController.listCoupons);

router.post('/', protect, requireRole('admin'), rateLimit('admin'), couponController.createCoupon);

router.put('/:id', protect, requireRole('admin'), rateLimit('admin'), couponController.updateCoupon);

router.delete('/:id', protect, requireRole('admin'), rateLimit('admin'), couponController.deleteCoupon);

router.patch('/:id/toggle', protect, requireRole('admin'), rateLimit('admin'), couponController.toggleCoupon);

module.exports = router;

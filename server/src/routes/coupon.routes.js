/**
 * Damini Marketplace - Coupon Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const couponController = require('../controllers/coupon.controller');

const router = express.Router();

/** POST /coupons/validate — check coupon validity */
router.post('/validate', protect, couponController.validateCoupon);

/** GET /coupons/available — available coupons for user */
router.get('/available', protect, couponController.getAvailableCoupons);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/', protect, requireRole('admin'), couponController.listCoupons);

router.post('/', protect, requireRole('admin'), couponController.createCoupon);

router.put('/:id', protect, requireRole('admin'), couponController.updateCoupon);

router.delete('/:id', protect, requireRole('admin'), couponController.deleteCoupon);

router.patch('/:id/toggle', protect, requireRole('admin'), couponController.toggleCoupon);

module.exports = router;

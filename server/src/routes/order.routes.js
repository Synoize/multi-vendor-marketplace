/**
 * Damini Marketplace - Order Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { attachVendor } = require('../middlewares/vendor.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const orderController = require('../controllers/order.controller');

const router = express.Router();

// ─── Customer routes ──────────────────────────────────────────────────────────
router.post('/', protect, rateLimit('order'), orderController.createOrder);

router.get('/', protect, rateLimit('read'), orderController.getUserOrders);

router.get('/my/:orderId', protect, rateLimit('read'), orderController.getMyOrder);

router.delete('/:orderId/cancel', protect, rateLimit('write'), orderController.cancelOrder);

// ─── Vendor routes ────────────────────────────────────────────────────────────
router.get('/vendor', protect, requireRole('vendor'), attachVendor, rateLimit('read'), orderController.getVendorOrders);

router.get('/vendor/:orderId', protect, requireRole('vendor'), attachVendor, rateLimit('read'), orderController.getVendorOrderDetail);

router.patch('/vendor/:orderId/confirm', protect, requireRole('vendor'), attachVendor, rateLimit('write'), orderController.confirmVendorOrder);

router.patch('/vendor/:orderId/ship', protect, requireRole('vendor'), attachVendor, rateLimit('write'), orderController.shipVendorOrder);

router.patch('/vendor/:orderId/deliver', protect, requireRole('vendor'), attachVendor, rateLimit('write'), orderController.deliverVendorOrder);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get('/admin', protect, requireRole('admin'), rateLimit('admin'), orderController.getAllOrders);

router.get('/admin/stats', protect, requireRole('admin'), rateLimit('admin'), orderController.getOrderStats);

router.get('/admin/:orderId', protect, requireRole('admin'), rateLimit('admin'), orderController.getAdminOrder);

router.patch('/admin/:orderId/status', protect, requireRole('admin'), rateLimit('admin'), orderController.updateOrderStatus);

module.exports = router;

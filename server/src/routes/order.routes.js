/**
 * Damini Marketplace - Order Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { attachVendor } = require('../middlewares/vendor.middleware');
const orderController = require('../controllers/order.controller');

const router = express.Router();

// ─── Customer routes ──────────────────────────────────────────────────────────
router.post('/', protect, orderController.createOrder);

router.get('/', protect, orderController.getUserOrders);

router.get('/my/:orderId', protect, orderController.getMyOrder);

router.delete('/:orderId/cancel', protect, orderController.cancelOrder);

// ─── Vendor routes ────────────────────────────────────────────────────────────
router.get('/vendor', protect, requireRole('vendor'), attachVendor, orderController.getVendorOrders);

router.patch('/vendor/:orderId/confirm', protect, requireRole('vendor'), attachVendor, orderController.confirmVendorOrder);

router.patch('/vendor/:orderId/ship', protect, requireRole('vendor'), attachVendor, orderController.shipVendorOrder);

router.patch('/vendor/:orderId/deliver', protect, requireRole('vendor'), attachVendor, orderController.deliverVendorOrder);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get('/admin', protect, requireRole('admin'), orderController.getAllOrders);

router.get('/admin/stats', protect, requireRole('admin'), orderController.getOrderStats);

router.get('/admin/:orderId', protect, requireRole('admin'), orderController.getAdminOrder);

router.patch('/admin/:orderId/status', protect, requireRole('admin'), orderController.updateOrderStatus);

module.exports = router;

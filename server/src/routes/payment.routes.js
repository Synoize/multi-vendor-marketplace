/**
 * Damini Marketplace - Payment Routes
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

/** POST /payments/create-order — legacy: create Razorpay order for existing order (adsmanager) */
router.post('/create-order', protect, paymentController.createOrder);

/** POST /payments/initiate — create Razorpay order (order is created only after payment) */
router.post('/initiate', protect, paymentController.initiatePayment);

/** POST /payments/verify — verify payment, then create the order */
router.post('/verify', protect, paymentController.verifyPayment);

/** GET /payments/:orderId — get payment details */
router.get('/:orderId', protect, paymentController.getPaymentByOrder);

/** POST /payments/webhook — Razorpay webhook (raw body) */
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;

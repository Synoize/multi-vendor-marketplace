/**
 * Damini Marketplace - Payment Routes
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

/** POST /payments/create-order — legacy: create Razorpay order for existing order (adsmanager) */
router.post('/create-order', protect, rateLimit('payment'), paymentController.createOrder);

/** POST /payments/initiate — create Razorpay order (order is created only after payment) */
router.post('/initiate', protect, rateLimit('payment'), paymentController.initiatePayment);

/** POST /payments/verify — verify payment, then create the order */
router.post('/verify', protect, rateLimit('payment'), paymentController.verifyPayment);

/** GET /payments/:orderId — get payment details */
router.get('/:orderId', protect, rateLimit('read'), paymentController.getPaymentByOrder);

/** POST /payments/wallet-recharge — create Razorpay order for ads wallet recharge */
router.post('/wallet-recharge', protect, rateLimit('payment'), paymentController.walletRecharge);

/** POST /payments/wallet-verify — verify recharge & credit the ads wallet */
router.post('/wallet-verify', protect, rateLimit('payment'), paymentController.verifyWalletRecharge);

/** POST /payments/webhook — Razorpay webhook (raw body); NOT user-rate-limited */
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;

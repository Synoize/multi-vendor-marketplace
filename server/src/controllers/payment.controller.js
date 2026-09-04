/**
 * Damini Marketplace - Payment Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated } = require('../utils/response.util');
const { queryOne } = require('../database/connection');
const paymentService = require('../services/payment.service');

/** POST /payments/create-order — legacy: create Razorpay order for existing order (adsmanager) */
const createOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const data = await paymentService.createRazorpayOrder(orderId, req.user.id);
  sendCreated(res, data, 'Payment order created');
});

/** POST /payments/initiate — create Razorpay order (order is created only after payment) */
const initiatePayment = asyncHandler(async (req, res) => {
  const data = await paymentService.initiateRazorpayOrder(req.user.id, req.body);
  sendCreated(res, data, 'Payment initiated');
});

/** POST /payments/verify — verify payment, then create the order */
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, signature } = req.body;
  const result = await paymentService.verifyPayment(razorpayOrderId, razorpayPaymentId, signature, req.user.id);
  sendSuccess(res, result);
});

/** GET /payments/:orderId — get payment details */
const getPaymentByOrder = asyncHandler(async (req, res) => {
  const payment = await queryOne(
    'SELECT * FROM payments WHERE order_id = ?', [req.params.orderId]
  );
  sendSuccess(res, payment);
});

/** POST /payments/webhook — Razorpay webhook (raw body) */
const handleWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['x-razorpay-signature'];
  const body = JSON.parse(req.body);
  await paymentService.handleWebhook(body, sig);
  res.json({ status: 'ok' });
});

/** POST /payments/wallet-recharge — create Razorpay order for ads wallet recharge */
const walletRecharge = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const data = await paymentService.createWalletRechargeOrder(req.user.id, amount);
  sendCreated(res, data, 'Wallet recharge order created');
});

/** POST /payments/wallet-verify — verify recharge payment & credit the wallet */
const verifyWalletRecharge = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, signature } = req.body;
  const result = await paymentService.verifyWalletRecharge(razorpayOrderId, razorpayPaymentId, signature, req.user.id);
  sendSuccess(res, result, result.message);
});

module.exports = {
  createOrder,
  initiatePayment,
  verifyPayment,
  getPaymentByOrder,
  handleWebhook,
  walletRecharge,
  verifyWalletRecharge,
};

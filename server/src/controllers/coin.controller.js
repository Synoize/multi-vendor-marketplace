/**
 * Damini Marketplace - Coin Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess } = require('../utils/response.util');
const coinService = require('../services/coin.service');

/**
 * GET /coins/balance
 * Get current user's coin balance
 */
const getBalance = asyncHandler(async (req, res) => {
  const balance = await coinService.getBalance(req.user.id);
  sendSuccess(res, { balance });
});

/**
 * GET /coins/transactions
 * Get coin transaction history
 */
const getTransactions = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = parseInt(req.query.offset) || 0;
  const transactions = await coinService.getTransactions(req.user.id, limit, offset);
  sendSuccess(res, { transactions });
});

/**
 * GET /coins/max-redeemable
 * Calculate max coins redeemable for a given order subtotal
 */
const getMaxRedeemable = asyncHandler(async (req, res) => {
  const orderSubtotal = parseFloat(req.query.subtotal) || 0;
  const maxRedeemable = await coinService.getMaxRedeemable(req.user.id, orderSubtotal);
  const discount = maxRedeemable * coinService.REDEMPTION_RATE;
  sendSuccess(res, { maxRedeemable, discount, rate: coinService.REDEMPTION_RATE, minRedemption: coinService.MIN_REDEMPTION });
});

module.exports = {
  getBalance,
  getTransactions,
  getMaxRedeemable,
};

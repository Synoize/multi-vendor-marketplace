/**
 * Damini Marketplace - Coin Routes
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const coinController = require('../controllers/coin.controller');

const router = express.Router();

/**
 * GET /coins/balance
 * Get current user's coin balance
 */
router.get('/balance', protect, coinController.getBalance);

/**
 * GET /coins/transactions
 * Get coin transaction history
 */
router.get('/transactions', protect, coinController.getTransactions);

/**
 * GET /coins/max-redeemable
 * Calculate max coins redeemable for a given order subtotal
 */
router.get('/max-redeemable', protect, coinController.getMaxRedeemable);

module.exports = router;

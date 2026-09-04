/**
 * Damini Marketplace - Coin Service
 * Handles Damini Coins: balance, credit, debit, redemption
 */

const config = require('config');
const { query, queryOne, queryRows, transaction } = require('../database/connection');
const logger = require('../utils/logger.util');

const REFERRAL_REWARD = config.get('coins.referralReward');
const FIRST_PURCHASE_REWARD = config.get('coins.firstPurchaseReward');
const REDEMPTION_RATE = config.get('coins.redemptionRate');
const MIN_REDEMPTION = config.get('coins.minRedemption');
const MIN_ORDER_FOR_REDEMPTION = config.get('coins.minOrderForRedemption');
const MIN_ORDER_FOR_REFERRAL_REWARD = config.get('coins.minOrderForReferralReward');

/**
 * Get or create coin balance for a user
 */
const getBalance = async (userId) => {
  let coins = await queryOne('SELECT balance FROM user_coins WHERE user_id = ?', [userId]);
  if (!coins) {
    await query('INSERT INTO user_coins (user_id, balance) VALUES (?, 0)', [userId]);
    coins = { balance: 0 };
  }
  return coins.balance;
};

/**
 * Credit coins to a user (atomic: update balance + insert transaction)
 * @returns {Object} { balanceAfter, transaction }
 */
const addCoins = async (userId, amount, reason, referenceId = null, description = null) => {
  if (!amount || amount <= 0) throw Object.assign(new Error('Invalid coin amount'), { statusCode: 400 });

  const result = await transaction(async (conn) => {
    // Ensure coin row exists
    const [existing] = await conn.execute('SELECT balance FROM user_coins WHERE user_id = ?', [userId]);
    if (existing.length === 0) {
      await conn.execute('INSERT INTO user_coins (user_id, balance) VALUES (?, 0)', [userId]);
    }

    // Atomic increment
    await conn.execute('UPDATE user_coins SET balance = balance + ? WHERE user_id = ?', [amount, userId]);

    // Get new balance
    const [rows] = await conn.execute('SELECT balance FROM user_coins WHERE user_id = ?', [userId]);
    const balanceAfter = rows[0].balance;

    // Log transaction
    const [txResult] = await conn.execute(
      'INSERT INTO coin_transactions (user_id, type, amount, reason, reference_id, description, balance_after) VALUES (?, "credit", ?, ?, ?, ?, ?)',
      [userId, amount, reason, referenceId, description, balanceAfter]
    );

    return { balanceAfter, transactionId: txResult.insertId };
  });

  logger.info(`Coins credited: ${amount} to user ${userId} for ${reason}. Balance: ${result.balanceAfter}`);
  return result;
};

/**
 * Deduct coins from a user (atomic: check balance, update balance, insert transaction)
 * @returns {Object} { balanceAfter, transaction }
 */
const deductCoins = async (userId, amount, reason, referenceId = null, description = null) => {
  if (!amount || amount <= 0) throw Object.assign(new Error('Invalid coin amount'), { statusCode: 400 });

  const result = await transaction(async (conn) => {
    // Check balance
    const [existing] = await conn.execute('SELECT balance FROM user_coins WHERE user_id = ?', [userId]);
    if (existing.length === 0 || existing[0].balance < amount) {
      throw Object.assign(new Error('Insufficient coins'), { statusCode: 400 });
    }

    // Atomic decrement
    await conn.execute('UPDATE user_coins SET balance = balance - ? WHERE user_id = ?', [amount, userId]);

    // Get new balance
    const [rows] = await conn.execute('SELECT balance FROM user_coins WHERE user_id = ?', [userId]);
    const balanceAfter = rows[0].balance;

    // Log transaction
    const [txResult] = await conn.execute(
      'INSERT INTO coin_transactions (user_id, type, amount, reason, reference_id, description, balance_after) VALUES (?, "debit", ?, ?, ?, ?, ?)',
      [userId, amount, reason, referenceId, description, balanceAfter]
    );

    return { balanceAfter, transactionId: txResult.insertId };
  });

  logger.info(`Coins deducted: ${amount} from user ${userId} for ${reason}. Balance: ${result.balanceAfter}`);
  return result;
};

/**
 * Get coin transaction history
 */
const getTransactions = async (userId, limit = 20, offset = 0) => {
  return queryRows(
    'SELECT * FROM coin_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, limit, offset]
  );
};

/**
 * Calculate max redeemable coins for a given order subtotal
 * Rules: minRedemption coins, minOrderForRedemption order total, can't exceed order/REDEMPTION_RATE
 */
const getMaxRedeemable = async (userId, orderSubtotal) => {
  const balance = await getBalance(userId);
  if (balance < MIN_REDEMPTION) return 0;
  if (orderSubtotal < MIN_ORDER_FOR_REDEMPTION) return 0;

  const maxByOrder = Math.floor(orderSubtotal / REDEMPTION_RATE);
  return Math.min(balance, maxByOrder);
};

/**
 * Redeem coins for an order discount
 * @param {string} userId
 * @param {number} coinsToRedeem
 * @param {string} orderId
 * @param {number} orderSubtotal
 * @returns {Object} { discount, coinsUsed }
 */
const redeemCoins = async (userId, coinsToRedeem, orderId, orderSubtotal) => {
  if (!coinsToRedeem || coinsToRedeem <= 0) return { discount: 0, coinsUsed: 0 };
  if (orderSubtotal < MIN_ORDER_FOR_REDEMPTION) {
    throw Object.assign(new Error(`Minimum order of ₹${MIN_ORDER_FOR_REDEMPTION} required to redeem coins`), { statusCode: 400 });
  }
  if (coinsToRedeem < MIN_REDEMPTION) {
    throw Object.assign(new Error(`Minimum ${MIN_REDEMPTION} coins required to redeem`), { statusCode: 400 });
  }

  const maxRedeemable = await getMaxRedeemable(userId, orderSubtotal);
  const coinsUsed = Math.min(coinsToRedeem, maxRedeemable);
  if (coinsUsed <= 0) return { discount: 0, coinsUsed: 0 };

  const discount = coinsUsed * REDEMPTION_RATE;

  await deductCoins(userId, coinsUsed, 'redemption', orderId, `Redeemed ${coinsUsed} coins for order discount`);

  return { discount, coinsUsed };
};

module.exports = {
  getBalance,
  addCoins,
  deductCoins,
  getTransactions,
  getMaxRedeemable,
  redeemCoins,
  REFERRAL_REWARD,
  FIRST_PURCHASE_REWARD,
  REDEMPTION_RATE,
  MIN_REDEMPTION,
  MIN_ORDER_FOR_REDEMPTION,
  MIN_ORDER_FOR_REFERRAL_REWARD,
};

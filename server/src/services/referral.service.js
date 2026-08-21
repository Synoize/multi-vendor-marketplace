/**
 * Damini Marketplace - Referral Service
 * Handles referral rewards on order delivery
 */

const config = require('config');
const { query, queryOne, transaction } = require('../database/connection');
const coinService = require('./coin.service');
const logger = require('../utils/logger.util');

const MIN_ORDER_FOR_REFERRAL_REWARD = config.get('coins.minOrderForReferralReward');

/**
 * Process referral and first-purchase coin rewards after an order is delivered.
 * Called from the vendor deliver endpoint.
 *
 * Rules:
 * 1. If the customer was referred (users.referred_by IS NOT NULL):
 *    - On their FIRST delivered order → credit 50 coins to the new customer
 *    - If order total >= ₹5000 → credit 100 coins to the referrer
 * 2. No coins on cancelled/refunded orders (only called on delivery)
 * 3. Self-referral is prevented at registration time
 */
const processDeliveryRewards = async (orderId) => {
  try {
    // Get the order
    const order = await queryOne(
      'SELECT id, user_id, total FROM orders WHERE id = ?',
      [orderId]
    );
    if (!order) {
      logger.warn(`Referral rewards: Order ${orderId} not found`);
      return;
    }

    // Get the customer info
    const customer = await queryOne(
      'SELECT id, referred_by FROM users WHERE id = ?',
      [order.user_id]
    );
    if (!customer || !customer.referred_by) {
      // Not a referred user, no rewards to process
      return;
    }

    const referrerId = customer.referred_by;
    const refereeId = customer.id;

    // Find the referral record
    const referral = await queryOne(
      'SELECT id, referrer_coins_credited, referee_coins_credited, first_order_id FROM referrals WHERE referrer_id = ? AND referee_id = ?',
      [referrerId, refereeId]
    );
    if (!referral) {
      logger.warn(`Referral rewards: No referral record for referrer=${referrerId}, referee=${refereeId}`);
      return;
    }

    // Ensure coin rows exist for both users
    await coinService.getBalance(referrerId);
    await coinService.getBalance(refereeId);

    // --- First Purchase Reward (50 coins to referee) ---
    if (!referral.referee_coins_credited) {
      // Check if this is the referee's first delivered order
      const previousDelivered = await queryOne(
        `SELECT id FROM orders 
         WHERE user_id = ? AND status = 'delivered' AND id != ? 
         ORDER BY delivered_at ASC LIMIT 1`,
        [refereeId, orderId]
      );

      if (!previousDelivered) {
        // This IS the first delivered order
        await coinService.addCoins(
          refereeId,
          coinService.FIRST_PURCHASE_REWARD,
          'first_purchase',
          orderId,
          'Welcome reward for your first purchase via referral'
        );

        await transaction(async (conn) => {
          await conn.execute(
            'UPDATE referrals SET referee_coins_credited = 1, first_order_id = ? WHERE id = ?',
            [orderId, referral.id]
          );
        });

        logger.info(`First purchase reward: ${coinService.FIRST_PURCHASE_REWARD} coins to user ${refereeId} for order ${orderId}`);
      }
    }

    // --- Referrer Reward (100 coins if order >= ₹5000) ---
    if (!referral.referrer_coins_credited && parseFloat(order.total) >= MIN_ORDER_FOR_REFERRAL_REWARD) {
      await coinService.addCoins(
        referrerId,
        coinService.REFERRAL_REWARD,
        'referral_reward',
        orderId,
        `Referral reward: Your friend's order of ₹${parseFloat(order.total).toLocaleString('en-IN')} has been delivered`
      );

      await transaction(async (conn) => {
        await conn.execute(
          'UPDATE referrals SET referrer_coins_credited = 1, status = "credited", credited_at = NOW() WHERE id = ?',
          [referral.id]
        );
      });

      logger.info(`Referral reward: ${coinService.REFERRAL_REWARD} coins to referrer ${referrerId} for order ${orderId}`);
    }
  } catch (err) {
    // Don't let coin errors break the delivery flow
    logger.error(`Referral rewards failed for order ${orderId}:`, err.message);
  }
};

module.exports = { processDeliveryRewards };

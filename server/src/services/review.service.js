/**
 * Damini Marketplace - Review Routes, Controller, Service
 */

// ─── SERVICE ─────────────────────────────────────────────────────────────────
// server/src/services/review.service.js

const { queryRows, queryOne, query, transaction } = require('../database/connection');
const { getPagination } = require('../utils/pagination.util');

/**
 * Create or update a product review
 * Reviews are only allowed for users who have received (delivered) this product.
 * @param {string} userId
 * @param {string} productId
 * @param {Object} data - { orderItemId, rating, title, comment, images }
 */
const createReview = async (userId, productId, data) => {
  const { orderItemId, rating, title, comment, images } = data;

  let orderItemIdToUse = orderItemId || null;
  let isVerified = false;

  // If an orderItemId was provided, confirm it's a delivered purchase by this user.
  if (orderItemIdToUse) {
    const item = await queryOne(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE oi.id = ? AND o.user_id = ? AND oi.product_id = ? 
       AND oi.status = 'delivered'`,
      [orderItemIdToUse, userId, productId]
    );
    isVerified = !!item;
    if (!isVerified) orderItemIdToUse = null;
  }

  // Otherwise auto-find an eligible (delivered, unreviewed) order item.
  if (!isVerified) {
    const item = await queryOne(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = ? AND oi.product_id = ? 
       AND oi.status = 'delivered' AND oi.is_reviewed = 0
       ORDER BY oi.created_at DESC
       LIMIT 1`,
      [userId, productId]
    );
    if (item) {
      orderItemIdToUse = item.id;
      isVerified = true;
    }
  }

  // A user without any delivered order for this product cannot review it —
  // unless they already have a review (allows editing their own review).
  if (!isVerified) {
    const existing = await queryOne(
      'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    if (!existing) {
      throw Object.assign(
        new Error('Only customers who purchased this product can review it.'),
        { statusCode: 403 }
      );
    }
  }

  const imagesJson = images ? JSON.stringify(images) : null;

  await query(
    `INSERT INTO reviews (product_id, user_id, order_item_id, rating, title, comment, images, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), title = VALUES(title), 
     comment = VALUES(comment), images = VALUES(images), updated_at = NOW()`,
    [productId, userId, orderItemIdToUse || null, rating, title || null, comment || null, imagesJson, isVerified ? 1 : 0]
  );

  // Mark order item as reviewed
  if (orderItemIdToUse && isVerified) {
    await query('UPDATE order_items SET is_reviewed = 1 WHERE id = ?', [orderItemIdToUse]);
  }

  // Recalculate product rating
  await updateProductRating(productId);
};

/**
 * Check whether a user is eligible to review a product.
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<{canReview: boolean, orderItemId: string|null, alreadyReviewed: boolean}>}
 */
const checkReviewEligibility = async (userId, productId) => {
  const item = await queryOne(
    `SELECT oi.id FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = ? AND oi.product_id = ? 
     AND oi.status = 'delivered' AND oi.is_reviewed = 0
     ORDER BY oi.created_at DESC
     LIMIT 1`,
    [userId, productId]
  );

  const existing = await queryOne(
    'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
    [userId, productId]
  );

  return {
    canReview: !!item || !!existing,
    orderItemId: item?.id || null,
    alreadyReviewed: !!existing,
  };
};

/**
 * Recalculate and update product average rating
 */
const updateProductRating = async (productId) => {
  const [result] = await query(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE product_id = ? AND is_approved = 1',
    [productId]
  );
  const avg = parseFloat(result[0]?.avg_rating || 0).toFixed(2);
  const total = result[0]?.total || 0;
  await query(
    'UPDATE products SET rating = ?, total_reviews = ? WHERE id = ?',
    [avg, total, productId]
  );
};

/**
 * Get reviews for a product
 */
const getProductReviews = async (productId, { page = 1, limit = 10, rating }) => {
  const offset = (page - 1) * limit;
  const params = [productId];
  let ratingFilter = '';
  if (rating) {
    ratingFilter = ' AND r.rating = ?';
    params.push(rating);
  }

  const reviews = await queryRows(
    `SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.product_id = ? AND r.is_approved = 1${ratingFilter}
     ORDER BY r.is_verified DESC, r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countResult] = await query(
    `SELECT COUNT(*) as total FROM reviews WHERE product_id = ? AND is_approved = 1${ratingFilter}`,
    params
  );

  const stats = await queryOne(
    `SELECT 
      AVG(rating) as avg_rating,
      COUNT(*) as total,
      SUM(rating = 5) as five_star,
      SUM(rating = 4) as four_star,
      SUM(rating = 3) as three_star,
      SUM(rating = 2) as two_star,
      SUM(rating = 1) as one_star
     FROM reviews WHERE product_id = ? AND is_approved = 1`,
    [productId]
  );

  return {
    reviews: reviews.map(r => ({ ...r, images: r.images ? JSON.parse(r.images) : [] })),
    stats,
    total: countResult[0]?.total || 0,
    page,
    limit,
  };
};

/**
 * Delete a review
 */
const deleteReview = async (reviewId, userId) => {
  const review = await queryOne('SELECT * FROM reviews WHERE id = ? AND user_id = ?', [reviewId, userId]);
  if (!review) throw Object.assign(new Error('Review not found'), { statusCode: 404 });
  await query('DELETE FROM reviews WHERE id = ?', [reviewId]);
  await updateProductRating(review.product_id);
};

module.exports = { createReview, getProductReviews, deleteReview, updateProductRating, checkReviewEligibility };

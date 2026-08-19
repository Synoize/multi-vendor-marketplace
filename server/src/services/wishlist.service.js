/**
 * Damini Marketplace - Wishlist Service
 * Handles wishlist CRUD operations with product details and move-to-cart.
 */

'use strict';

const { query, queryRows, queryOne, transaction } = require('../database/connection');
const { getPagination } = require('../utils/pagination.util');
const logger = require('../utils/logger.util');

// ─────────────────────────────────────────────────────────────────────────────
// getWishlist
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Fetch paginated wishlist for a user with full product details.
 *
 * @param {string} userId
 * @param {Object} queryParams - req.query for pagination
 * @returns {Promise<{ items, total, page, limit }>}
 */
async function getWishlist(userId, queryParams = {}) {
  try {
    const { page, limit, offset } = getPagination(queryParams, 20);

    const [countRow] = await queryRows(
      `SELECT COUNT(*) AS total FROM wishlists WHERE user_id = ?`,
      [userId]
    );
    const total = parseInt(countRow.total, 10);

    const items = await queryRows(
      `SELECT
         w.id          AS wishlist_item_id,
         w.product_id,
         w.created_at  AS wishlisted_at,
         p.name        AS product_name,
         p.slug        AS product_slug,
         p.price,
         p.mrp,
         p.rating,
         p.total_reviews,
         p.status      AS product_status,
         p.stock,
         p.is_cod_available,
         (
           SELECT pi.url
           FROM   product_images pi
           WHERE  pi.product_id = p.id AND pi.is_primary = 1
           LIMIT  1
         ) AS product_image,
         v.store_name  AS vendor_name,
         v.id          AS vendor_id,
         -- Check if item is already in cart
         (
           SELECT COUNT(*) FROM carts c
           WHERE c.user_id = w.user_id AND c.product_id = w.product_id AND c.saved_for_later = 0
         ) AS in_cart
       FROM wishlists w
       JOIN products  p ON p.id = w.product_id AND p.deleted_at IS NULL
       JOIN vendors   v ON v.id = p.vendor_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const parsedItems = items.map((item) => ({
      ...item,
      price: parseFloat(item.price),
      mrp: parseFloat(item.mrp),
      rating: parseFloat(item.rating),
      in_cart: !!item.in_cart,
      is_available: item.product_status === 'active' && item.stock > 0,
    }));

    return { items: parsedItems, total, page, limit };
  } catch (err) {
    logger.error('WishlistService.getWishlist error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// addToWishlist
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Add a product to the user's wishlist. Silently ignores duplicates.
 *
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<{ wishlistItemId: string, productId: string }>}
 */
async function addToWishlist(userId, productId) {
  try {
    // Validate product exists and is active
    const product = await queryOne(
      `SELECT id, name, status FROM products WHERE id = ? AND deleted_at IS NULL`,
      [productId]
    );
    if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });

    // INSERT IGNORE handles duplicate gracefully
    await query(
      `INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)`,
      [userId, productId]
    );

    const item = await queryOne(
      `SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    return { wishlistItemId: item.id, productId };
  } catch (err) {
    logger.error('WishlistService.addToWishlist error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// removeFromWishlist
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Remove a product from the user's wishlist by productId.
 *
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<boolean>}
 */
async function removeFromWishlist(userId, productId) {
  try {
    const [result] = await query(
      `DELETE FROM wishlists WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );
    if (result.affectedRows === 0) {
      throw Object.assign(new Error('Wishlist item not found'), { statusCode: 404 });
    }
    return true;
  } catch (err) {
    logger.error('WishlistService.removeFromWishlist error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// moveToCart
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Move a wishlist item to the cart (quantity = 1, optional variant).
 * The wishlist item is removed after adding to cart.
 *
 * @param {string} userId
 * @param {string} productId
 * @param {string|null} variantId
 * @returns {Promise<boolean>}
 */
async function moveToCart(userId, productId, variantId = null) {
  try {
    return await transaction(async (conn) => {
      // 1. Get wishlist item
      const [wlRows] = await conn.execute(
        `SELECT w.id, w.product_id, p.stock, p.status, p.price
         FROM wishlists w
         JOIN products p ON p.id = w.product_id
         WHERE w.user_id = ? AND w.product_id = ? AND p.deleted_at IS NULL`,
        [userId, productId]
      );
      if (!wlRows.length) {
        throw Object.assign(new Error('Wishlist item not found'), { statusCode: 404 });
      }
      const wlItem = wlRows[0];

      if (wlItem.status !== 'active') {
        throw Object.assign(new Error('Product is not currently available'), { statusCode: 400 });
      }
      if (wlItem.stock < 1) {
        throw Object.assign(new Error('Product is out of stock'), { statusCode: 400 });
      }

      // 2. Upsert into cart
      await conn.execute(
        `INSERT INTO carts (user_id, product_id, variant_id, quantity, saved_for_later)
         VALUES (?, ?, ?, 1, 0)
         ON DUPLICATE KEY UPDATE quantity = quantity + 1`,
        [userId, wlItem.product_id, variantId]
      );

      // 3. Remove from wishlist
      await conn.execute(`DELETE FROM wishlists WHERE id = ?`, [wlItem.id]);

      return true;
    });
  } catch (err) {
    logger.error('WishlistService.moveToCart error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// isWishlisted
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Check whether a product is in the user's wishlist.
 *
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<boolean>}
 */
async function isWishlisted(userId, productId) {
  try {
    const row = await queryOne(
      `SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );
    return !!row;
  } catch (err) {
    logger.error('WishlistService.isWishlisted error:', err);
    throw err;
  }
}

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
  isWishlisted,
};

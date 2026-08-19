/**
 * Damini Marketplace - Cart Service
 * Handles all shopping cart operations: add, update, remove, move to wishlist, save for later.
 */

'use strict';

const { query, queryRows, queryOne, transaction } = require('../database/connection');
const logger = require('../utils/logger.util');
const { getShippingConfig } = require('../utils/shipping.util');


// In-memory locks to serialize concurrent cart operations per user & product
const cartLocks = new Map();

async function acquireLock(key) {
  while (cartLocks.has(key)) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  cartLocks.set(key, true);
}

function releaseLock(key) {
  cartLocks.delete(key);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calculate cart totals from items array
 * @param {Array} items - Cart items with effective_price and quantity
 * @returns {{ subtotal: number, itemCount: number }}
 */
function calcTotals(items) {
  let subtotal = 0;
  let itemCount = 0;
  for (const item of items) {
    const price = parseFloat(item.effective_price);
    const qty = parseInt(item.quantity, 10);
    subtotal += price * qty;
    itemCount += qty;
  }
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    itemCount,
  };
}

// ─── Cart SELECT Query Fragment ───────────────────────────────────────────────
const CART_ITEM_SELECT = `
  SELECT
    c.id            AS cart_item_id,
    c.user_id,
    c.product_id,
    c.variant_id,
    c.quantity,
    c.saved_for_later,
    c.created_at    AS added_at,
    p.name          AS product_name,
    p.slug          AS product_slug,
    p.status        AS product_status,
    p.is_cod_available,
    p.stock         AS product_stock,
    COALESCE(pv.price, p.price)   AS effective_price,
    COALESCE(pv.mrp,   p.mrp)     AS effective_mrp,
    (
      SELECT pi.url
      FROM   product_images pi
      WHERE  pi.product_id = p.id AND pi.is_primary = 1
      LIMIT  1
    ) AS product_image,
    pv.name         AS variant_name,
    pv.sku          AS variant_sku,
    pv.attributes   AS variant_attributes,
    pv.stock        AS variant_stock,
    pv.image        AS variant_image,
    v.id            AS vendor_id,
    v.store_name    AS vendor_name
  FROM  carts c
  JOIN  products p  ON p.id = c.product_id
  JOIN  vendors  v  ON v.id = p.vendor_id
  LEFT JOIN product_variants pv ON pv.id = c.variant_id
`;

// ─────────────────────────────────────────────────────────────────────────────
// getCart
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Fetch active cart items (saved_for_later = 0) with full product details and calculated totals.
 *
 * @param {string} userId - UUID of the authenticated user
 * @returns {Promise<{ items, savedItems, subtotal, shipping, total, itemCount }>}
 */
async function getCart(userId) {
  try {
    const rows = await queryRows(
      `${CART_ITEM_SELECT}
       WHERE c.user_id = ? AND p.deleted_at IS NULL
       ORDER BY c.created_at DESC`,
      [userId]
    );

    const parseItem = (item) => ({
      ...item,
      id: item.cart_item_id, // Map cart_item_id to id for frontend compatibility
      unit_price: parseFloat(item.effective_price),
      mrp: parseFloat(item.effective_mrp),
      variant_attributes: item.variant_attributes
        ? (typeof item.variant_attributes === 'string'
            ? JSON.parse(item.variant_attributes)
            : item.variant_attributes)
        : null,
      effective_price: parseFloat(item.effective_price),
      effective_mrp: parseFloat(item.effective_mrp),
      is_available:
        item.product_status === 'active' &&
        (item.variant_id
          ? parseInt(item.variant_stock, 10) >= parseInt(item.quantity, 10)
          : parseInt(item.product_stock, 10) >= parseInt(item.quantity, 10)),
    });

    const items = rows.filter((r) => !r.saved_for_later).map(parseItem);
    const savedItems = rows.filter((r) => r.saved_for_later).map(parseItem);

    const { subtotal, itemCount } = calcTotals(items);
    const { shippingCharge, freeShippingThreshold } = await getShippingConfig();
    const shipping = subtotal > 0 && subtotal < freeShippingThreshold ? shippingCharge : 0;

    return {
      items,
      savedItems,
      subtotal,
      shipping,
      total: parseFloat((subtotal + shipping).toFixed(2)),
      itemCount,
      freeShippingThreshold,
      shippingCharge,
    };
  } catch (err) {
    logger.error('CartService.getCart error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// addToCart
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Add a product/variant to the user's cart. Increments quantity if already present.
 *
 * @param {string} userId
 * @param {string} productId
 * @param {string|null} variantId
 * @param {number} quantity
 * @returns {Promise<{ count: number, uniqueItems: number }>}
 */
async function addToCart(userId, productId, variantId = null, quantity = 1) {
  const lockKey = `${userId}:${productId}:${variantId || 'null'}`;
  await acquireLock(lockKey);
  try {
    if (quantity < 1) {
      throw Object.assign(new Error('Quantity must be at least 1'), { statusCode: 400 });
    }

    const product = await queryOne(
      `SELECT id, name, price, stock, status FROM products WHERE id = ? AND deleted_at IS NULL`,
      [productId]
    );
    if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });
    if (product.status !== 'active') {
      throw Object.assign(new Error('Product is not currently available'), { statusCode: 400 });
    }

    let availableStock = product.stock;
    if (variantId) {
      const variant = await queryOne(
        `SELECT id, stock, is_active FROM product_variants WHERE id = ? AND product_id = ?`,
        [variantId, productId]
      );
      if (!variant || !variant.is_active) {
        throw Object.assign(new Error('Product variant not found or inactive'), { statusCode: 404 });
      }
      availableStock = variant.stock;
    }

    // Check if item exists (including saved-for-later)
    const existing = await queryOne(
      `SELECT id, quantity, saved_for_later FROM carts
       WHERE user_id = ? AND product_id = ? AND variant_id <=> ?`,
      [userId, productId, variantId]
    );

    if (existing && existing.saved_for_later) {
      // Item is saved for later — move it back to cart and update qty
      const newQty = Math.min(quantity, availableStock);
      await query(`UPDATE carts SET saved_for_later = 0, quantity = ? WHERE id = ?`, [newQty, existing.id]);
    } else if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > availableStock) {
        throw Object.assign(
          new Error(`Only ${availableStock} units available. You already have ${existing.quantity} in cart.`),
          { statusCode: 400 }
        );
      }
      await query(`UPDATE carts SET quantity = ? WHERE id = ?`, [newQty, existing.id]);
    } else {
      const [countRows] = await query(
        `SELECT COUNT(*) AS cnt FROM carts WHERE user_id = ? AND saved_for_later = 0`,
        [userId]
      );
      if (countRows[0].cnt >= 50) {
        throw Object.assign(new Error('Cart is full (max 50 unique items)'), { statusCode: 400 });
      }
      if (quantity > availableStock) {
        throw Object.assign(new Error(`Only ${availableStock} units available`), { statusCode: 400 });
      }
      await query(
        `INSERT INTO carts (user_id, product_id, variant_id, quantity, saved_for_later)
         VALUES (?, ?, ?, ?, 0)`,
        [userId, productId, variantId, quantity]
      );
    }

    return getCartCount(userId);
  } catch (err) {
    logger.error('CartService.addToCart error:', err);
    throw err;
  } finally {
    releaseLock(lockKey);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateCartItem
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Update the quantity of a cart item (validates stock).
 *
 * @param {string} cartItemId
 * @param {string} userId
 * @param {number} quantity
 * @returns {Promise<{ cartItemId, quantity, availableStock }>}
 */
async function updateCartItem(cartItemId, userId, quantity) {
  try {
    if (quantity < 1) throw Object.assign(new Error('Quantity must be at least 1'), { statusCode: 400 });
    if (quantity > 100) throw Object.assign(new Error('Maximum quantity per item is 100'), { statusCode: 400 });

    const item = await queryOne(
      `SELECT c.id, c.user_id, COALESCE(pv.stock, p.stock) AS available_stock
       FROM carts c
       JOIN products p ON p.id = c.product_id
       LEFT JOIN product_variants pv ON pv.id = c.variant_id
       WHERE c.id = ? AND c.user_id = ?`,
      [cartItemId, userId]
    );

    if (!item) throw Object.assign(new Error('Cart item not found'), { statusCode: 404 });
    if (quantity > item.available_stock) {
      throw Object.assign(new Error(`Only ${item.available_stock} units available`), { statusCode: 400 });
    }

    await query(`UPDATE carts SET quantity = ? WHERE id = ?`, [quantity, cartItemId]);
    return { cartItemId, quantity, availableStock: item.available_stock };
  } catch (err) {
    logger.error('CartService.updateCartItem error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// removeFromCart
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Remove a single item from the cart.
 *
 * @param {string} cartItemId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function removeFromCart(cartItemId, userId) {
  try {
    const [result] = await query(
      `DELETE FROM carts WHERE id = ? AND user_id = ?`,
      [cartItemId, userId]
    );
    if (result.affectedRows === 0) {
      throw Object.assign(new Error('Cart item not found'), { statusCode: 404 });
    }
    return true;
  } catch (err) {
    logger.error('CartService.removeFromCart error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// clearCart
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Remove ALL active cart items (saved-for-later kept).
 *
 * @param {string} userId
 * @returns {Promise<number>} Rows deleted
 */
async function clearCart(userId) {
  try {
    const [result] = await query(
      `DELETE FROM carts WHERE user_id = ? AND saved_for_later = 0`,
      [userId]
    );
    logger.info(`Cart cleared for user ${userId}: ${result.affectedRows} items removed`);
    return result.affectedRows;
  } catch (err) {
    logger.error('CartService.clearCart error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// moveToWishlist
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Move a cart item to the wishlist, then delete it from cart.
 *
 * @param {string} cartItemId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function moveToWishlist(cartItemId, userId) {
  try {
    return await transaction(async (conn) => {
      const [rows] = await conn.execute(
        `SELECT id, user_id, product_id FROM carts WHERE id = ? AND user_id = ?`,
        [cartItemId, userId]
      );
      if (!rows.length) throw Object.assign(new Error('Cart item not found'), { statusCode: 404 });

      const item = rows[0];
      await conn.execute(
        `INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)`,
        [userId, item.product_id]
      );
      await conn.execute(`DELETE FROM carts WHERE id = ?`, [item.id]);
      return true;
    });
  } catch (err) {
    logger.error('CartService.moveToWishlist error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// saveForLater
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Toggle an active cart item to saved-for-later.
 *
 * @param {string} cartItemId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function saveForLater(cartItemId, userId) {
  try {
    const [result] = await query(
      `UPDATE carts SET saved_for_later = 1 WHERE id = ? AND user_id = ? AND saved_for_later = 0`,
      [cartItemId, userId]
    );
    if (result.affectedRows === 0) {
      throw Object.assign(new Error('Cart item not found or already saved for later'), { statusCode: 404 });
    }
    return true;
  } catch (err) {
    logger.error('CartService.saveForLater error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// moveSavedToCart
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Move a saved-for-later item back to the active cart.
 *
 * @param {string} cartItemId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function moveSavedToCart(cartItemId, userId) {
  try {
    const item = await queryOne(
      `SELECT c.id, c.quantity, COALESCE(pv.stock, p.stock) AS available_stock, p.status
       FROM carts c
       JOIN products p ON p.id = c.product_id
       LEFT JOIN product_variants pv ON pv.id = c.variant_id
       WHERE c.id = ? AND c.user_id = ? AND c.saved_for_later = 1`,
      [cartItemId, userId]
    );
    if (!item) throw Object.assign(new Error('Saved item not found'), { statusCode: 404 });
    if (item.status !== 'active') {
      throw Object.assign(new Error('This product is no longer available'), { statusCode: 400 });
    }

    const qty = Math.min(item.quantity, item.available_stock || 0);
    if (qty < 1) throw Object.assign(new Error('Product is out of stock'), { statusCode: 400 });

    await query(`UPDATE carts SET saved_for_later = 0, quantity = ? WHERE id = ?`, [qty, cartItemId]);
    return true;
  } catch (err) {
    logger.error('CartService.moveSavedToCart error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getCartCount
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Get item count in the active cart.
 *
 * @param {string} userId
 * @returns {Promise<{ count: number, uniqueItems: number }>}
 */
async function getCartCount(userId) {
  try {
    const row = await queryOne(
      `SELECT COUNT(*) AS unique_items, COALESCE(SUM(quantity), 0) AS total_qty
       FROM carts WHERE user_id = ? AND saved_for_later = 0`,
      [userId]
    );
    return {
      count: parseInt(row.total_qty, 10),
      uniqueItems: parseInt(row.unique_items, 10),
    };
  } catch (err) {
    logger.error('CartService.getCartCount error:', err);
    throw err;
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  moveToWishlist,
  saveForLater,
  moveSavedToCart,
  getCartCount,
};

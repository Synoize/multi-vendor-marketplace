/**
 * Damini Marketplace - Cart Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated } = require('../utils/response.util');
const cartService = require('../services/cart.service');

/** GET /cart */
const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getCart(req.user.id);
  sendSuccess(res, cart);
});

/** GET /cart/count */
const getCartCount = asyncHandler(async (req, res) => {
  const count = await cartService.getCartCount(req.user.id);
  sendSuccess(res, { count });
});

/** POST /cart */
const addToCart = asyncHandler(async (req, res) => {
  const { productId, variantId, quantity } = req.body;
  await cartService.addToCart(req.user.id, productId, variantId, quantity);
  sendCreated(res, null, 'Item added to cart');
});

/** PUT /cart/:itemId */
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  await cartService.updateCartItem(req.params.itemId, req.user.id, quantity);
  sendSuccess(res, null, 'Cart updated');
});

/** DELETE /cart/:itemId */
const removeFromCart = asyncHandler(async (req, res) => {
  await cartService.removeFromCart(req.params.itemId, req.user.id);
  sendSuccess(res, null, 'Item removed from cart');
});

/** DELETE /cart */
const clearCart = asyncHandler(async (req, res) => {
  await cartService.clearCart(req.user.id);
  sendSuccess(res, null, 'Cart cleared');
});

/** POST /cart/:itemId/save-for-later */
const saveForLater = asyncHandler(async (req, res) => {
  await cartService.saveForLater(req.params.itemId, req.user.id);
  sendSuccess(res, null, 'Item saved for later');
});

/** POST /cart/:itemId/move-to-cart */
const moveToCart = asyncHandler(async (req, res) => {
  await cartService.moveSavedToCart(req.params.itemId, req.user.id);
  sendSuccess(res, null, 'Item moved to cart');
});

module.exports = {
  getCart,
  getCartCount,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  saveForLater,
  moveToCart,
};

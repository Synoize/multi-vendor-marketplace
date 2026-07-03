/**
 * Damini Marketplace - Cart Routes
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated } = require('../utils/response.util');
const cartService = require('../services/cart.service');

const router = express.Router();

router.use(protect);

/** GET /cart */
router.get('/', asyncHandler(async (req, res) => {
  const cart = await cartService.getCart(req.user.id);
  sendSuccess(res, cart);
}));

/** GET /cart/count */
router.get('/count', asyncHandler(async (req, res) => {
  const count = await cartService.getCartCount(req.user.id);
  sendSuccess(res, { count });
}));

/** POST /cart */
router.post('/', asyncHandler(async (req, res) => {
  const { productId, variantId, quantity } = req.body;
  await cartService.addToCart(req.user.id, productId, variantId, quantity);
  sendCreated(res, null, 'Item added to cart');
}));

/** PUT /cart/:itemId */
router.put('/:itemId', asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  await cartService.updateCartItem(req.params.itemId, req.user.id, quantity);
  sendSuccess(res, null, 'Cart updated');
}));

/** DELETE /cart/:itemId */
router.delete('/:itemId', asyncHandler(async (req, res) => {
  await cartService.removeFromCart(req.params.itemId, req.user.id);
  sendSuccess(res, null, 'Item removed from cart');
}));

/** DELETE /cart */
router.delete('/', asyncHandler(async (req, res) => {
  await cartService.clearCart(req.user.id);
  sendSuccess(res, null, 'Cart cleared');
}));

/** POST /cart/:itemId/save-for-later */
router.post('/:itemId/save-for-later', asyncHandler(async (req, res) => {
  await cartService.saveForLater(req.params.itemId, req.user.id);
  sendSuccess(res, null, 'Item saved for later');
}));

/** POST /cart/:itemId/move-to-cart */
router.post('/:itemId/move-to-cart', asyncHandler(async (req, res) => {
  await cartService.moveSavedToCart(req.params.itemId, req.user.id);
  sendSuccess(res, null, 'Item moved to cart');
}));

module.exports = router;

/**
 * Damini Marketplace - Wishlist Routes
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated } = require('../utils/response.util');
const wishlistService = require('../services/wishlist.service');

const router = express.Router();
router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const wishlist = await wishlistService.getWishlist(req.user.id);
  sendSuccess(res, wishlist);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { productId } = req.body;
  await wishlistService.addToWishlist(req.user.id, productId);
  sendCreated(res, null, 'Added to wishlist');
}));

router.delete('/:productId', asyncHandler(async (req, res) => {
  await wishlistService.removeFromWishlist(req.user.id, req.params.productId);
  sendSuccess(res, null, 'Removed from wishlist');
}));

router.post('/:productId/move-to-cart', asyncHandler(async (req, res) => {
  const { variantId } = req.body;
  await wishlistService.moveToCart(req.user.id, req.params.productId, variantId);
  sendSuccess(res, null, 'Moved to cart');
}));

module.exports = router;

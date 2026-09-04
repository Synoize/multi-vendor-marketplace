/**
 * Damini Marketplace - Wishlist Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated } = require('../utils/response.util');
const wishlistService = require('../services/wishlist.service');

/** GET /wishlist */
const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await wishlistService.getWishlist(req.user.id);
  sendSuccess(res, wishlist);
});

/** POST /wishlist */
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  await wishlistService.addToWishlist(req.user.id, productId);
  sendCreated(res, null, 'Added to wishlist');
});

/** DELETE /wishlist/:productId */
const removeFromWishlist = asyncHandler(async (req, res) => {
  await wishlistService.removeFromWishlist(req.user.id, req.params.productId);
  sendSuccess(res, null, 'Removed from wishlist');
});

/** POST /wishlist/:productId/move-to-cart */
const moveToCart = asyncHandler(async (req, res) => {
  const { variantId } = req.body;
  await wishlistService.moveToCart(req.user.id, req.params.productId, variantId);
  sendSuccess(res, null, 'Moved to cart');
});

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
};

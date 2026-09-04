/**
 * Damini Marketplace - Wishlist Routes
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const wishlistController = require('../controllers/wishlist.controller');

const router = express.Router();
router.use(protect);

router.get('/', rateLimit('read'), wishlistController.getWishlist);

router.post('/', rateLimit('write'), wishlistController.addToWishlist);

router.delete('/:productId', rateLimit('write'), wishlistController.removeFromWishlist);

router.post('/:productId/move-to-cart', rateLimit('write'), wishlistController.moveToCart);

module.exports = router;

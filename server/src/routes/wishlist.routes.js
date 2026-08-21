/**
 * Damini Marketplace - Wishlist Routes
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const wishlistController = require('../controllers/wishlist.controller');

const router = express.Router();
router.use(protect);

router.get('/', wishlistController.getWishlist);

router.post('/', wishlistController.addToWishlist);

router.delete('/:productId', wishlistController.removeFromWishlist);

router.post('/:productId/move-to-cart', wishlistController.moveToCart);

module.exports = router;

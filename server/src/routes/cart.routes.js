/**
 * Damini Marketplace - Cart Routes
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const cartController = require('../controllers/cart.controller');

const router = express.Router();

router.use(protect);

/** GET /cart */
router.get('/', rateLimit('read'), cartController.getCart);

/** GET /cart/count */
router.get('/count', rateLimit('read'), cartController.getCartCount);

/** POST /cart */
router.post('/', rateLimit('cart'), cartController.addToCart);

/** PUT /cart/:itemId */
router.put('/:itemId', rateLimit('cart'), cartController.updateCartItem);

/** DELETE /cart/:itemId */
router.delete('/:itemId', rateLimit('cart'), cartController.removeFromCart);

/** DELETE /cart */
router.delete('/', rateLimit('cart'), cartController.clearCart);

/** POST /cart/:itemId/save-for-later */
router.post('/:itemId/save-for-later', rateLimit('cart'), cartController.saveForLater);

/** POST /cart/:itemId/move-to-cart */
router.post('/:itemId/move-to-cart', rateLimit('cart'), cartController.moveToCart);

module.exports = router;

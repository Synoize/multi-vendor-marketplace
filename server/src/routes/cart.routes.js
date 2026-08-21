/**
 * Damini Marketplace - Cart Routes
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const cartController = require('../controllers/cart.controller');

const router = express.Router();

router.use(protect);

/** GET /cart */
router.get('/', cartController.getCart);

/** GET /cart/count */
router.get('/count', cartController.getCartCount);

/** POST /cart */
router.post('/', cartController.addToCart);

/** PUT /cart/:itemId */
router.put('/:itemId', cartController.updateCartItem);

/** DELETE /cart/:itemId */
router.delete('/:itemId', cartController.removeFromCart);

/** DELETE /cart */
router.delete('/', cartController.clearCart);

/** POST /cart/:itemId/save-for-later */
router.post('/:itemId/save-for-later', cartController.saveForLater);

/** POST /cart/:itemId/move-to-cart */
router.post('/:itemId/move-to-cart', cartController.moveToCart);

module.exports = router;

/**
 * Damini Marketplace - User Routes
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { uploadAvatar } = require('../middlewares/upload.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();

/** GET /users/me/profile */
router.get('/me/profile', protect, userController.getProfile);

/** PUT /users/me/profile */
router.put('/me/profile', protect, userController.updateProfile);

/** POST /users/me/avatar */
router.post('/me/avatar', protect, uploadAvatar, userController.uploadAvatar);

/** GET /users/me/addresses */
router.get('/me/addresses', protect, userController.getAddresses);

/** POST /users/me/addresses */
router.post('/me/addresses', protect, userController.addAddress);

/** PUT /users/me/addresses/:id */
router.put('/me/addresses/:id', protect, userController.updateAddress);

/** DELETE /users/me/addresses/:id */
router.delete('/me/addresses/:id', protect, userController.deleteAddress);

/** GET /users/me/coins — Damini Coins balance and recent transactions */
router.get('/me/coins', protect, userController.getCoins);

/** GET /users/me/referral — referral code, stats, and shareable link */
router.get('/me/referral', protect, userController.getReferral);

/** DELETE /users/me — delete own account */
router.delete('/me', protect, userController.deleteAccount);

module.exports = router;

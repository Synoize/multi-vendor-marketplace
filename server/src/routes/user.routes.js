/**
 * Damini Marketplace - User Routes
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const { uploadAvatar } = require('../middlewares/upload.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();

/** GET /users/me/profile */
router.get('/me/profile', protect, rateLimit('read'), userController.getProfile);

/** PUT /users/me/profile */
router.put('/me/profile', protect, rateLimit('write'), userController.updateProfile);

/** POST /users/me/avatar */
router.post('/me/avatar', protect, rateLimit('upload'), uploadAvatar, userController.uploadAvatar);

/** GET /users/me/addresses */
router.get('/me/addresses', protect, rateLimit('read'), userController.getAddresses);

/** POST /users/me/addresses */
router.post('/me/addresses', protect, rateLimit('write'), userController.addAddress);

/** PUT /users/me/addresses/:id */
router.put('/me/addresses/:id', protect, rateLimit('write'), userController.updateAddress);

/** DELETE /users/me/addresses/:id */
router.delete('/me/addresses/:id', protect, rateLimit('write'), userController.deleteAddress);

/** GET /users/me/coins — Damini Coins balance and recent transactions */
router.get('/me/coins', protect, rateLimit('read'), userController.getCoins);

/** GET /users/me/referral — referral code, stats, and shareable link */
router.get('/me/referral', protect, rateLimit('read'), userController.getReferral);

/** GET /users/me/wallet — ads wallet balance and transactions */
router.get('/me/wallet', protect, rateLimit('read'), userController.getWallet);

/** DELETE /users/me — delete own account */
router.delete('/me', protect, rateLimit('write'), userController.deleteAccount);

module.exports = router;

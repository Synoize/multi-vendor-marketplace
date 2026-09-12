/**
 * Damini Marketplace - Offer Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const offerController = require('../controllers/offer.controller');

const router = express.Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/active', rateLimit('read'), offerController.getActiveOffers);

router.get('/:id/products', rateLimit('read'), offerController.getOfferProducts);

router.post('/validate', protect, rateLimit('coupon'), offerController.validateOffer);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/', protect, requireRole('admin'), rateLimit('admin'), offerController.listOffers);

router.post('/', protect, requireRole('admin'), rateLimit('admin'), offerController.createOffer);

router.put('/:id', protect, requireRole('admin'), rateLimit('admin'), offerController.updateOffer);

router.delete('/:id', protect, requireRole('admin'), rateLimit('admin'), offerController.deleteOffer);

router.patch('/:id/toggle', protect, requireRole('admin'), rateLimit('admin'), offerController.toggleOffer);

module.exports = router;

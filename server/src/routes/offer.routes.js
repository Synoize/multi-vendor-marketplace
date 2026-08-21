/**
 * Damini Marketplace - Offer Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const offerController = require('../controllers/offer.controller');

const router = express.Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/active', offerController.getActiveOffers);

router.post('/validate', protect, offerController.validateOffer);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/', protect, requireRole('admin'), offerController.listOffers);

router.post('/', protect, requireRole('admin'), offerController.createOffer);

router.put('/:id', protect, requireRole('admin'), offerController.updateOffer);

router.delete('/:id', protect, requireRole('admin'), offerController.deleteOffer);

router.patch('/:id/toggle', protect, requireRole('admin'), offerController.toggleOffer);

module.exports = router;

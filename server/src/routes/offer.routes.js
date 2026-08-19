const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response.util');
const offerService = require('../services/offer.service');

const router = express.Router();

// ─── Public ────────────────────────────────────────────────────────────────────
router.get('/active', asyncHandler(async (req, res) => {
  const offers = await offerService.getActiveOffers();
  sendSuccess(res, offers);
}));

router.post('/validate', protect, asyncHandler(async (req, res) => {
  const { offerId, cartItems, cartTotal } = req.body;
  const result = await offerService.applyOffer(offerId, req.user.id, cartItems, cartTotal);
  sendSuccess(res, result);
}));

// ─── Admin ─────────────────────────────────────────────────────────────────────
router.get('/', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await offerService.getOffers(req.query);
  sendPaginated(res, { data: result.items, total: result.total, page: result.page, limit: result.limit, message: 'Offers fetched' });
}));

router.post('/', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await offerService.createOffer(req.body);
  sendCreated(res, null, 'Offer created');
}));

router.put('/:id', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await offerService.updateOffer(req.params.id, req.body);
  sendSuccess(res, null, 'Offer updated');
}));

router.delete('/:id', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await offerService.deleteOffer(req.params.id);
  sendSuccess(res, null, 'Offer deleted');
}));

router.patch('/:id/toggle', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  await offerService.toggleOffer(req.params.id);
  sendSuccess(res, null, 'Offer status toggled');
}));

module.exports = router;

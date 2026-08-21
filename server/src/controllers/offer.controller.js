/**
 * Damini Marketplace - Offer Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response.util');
const offerService = require('../services/offer.service');

// ─── Public ───────────────────────────────────────────────────────────────────

/** GET /offers/active */
const getActiveOffers = asyncHandler(async (req, res) => {
  const offers = await offerService.getActiveOffers();
  sendSuccess(res, offers);
});

/** POST /offers/validate */
const validateOffer = asyncHandler(async (req, res) => {
  const { offerId, cartItems, cartTotal } = req.body;
  const result = await offerService.applyOffer(offerId, req.user.id, cartItems, cartTotal);
  sendSuccess(res, result);
});

// ─── Admin ────────────────────────────────────────────────────────────────────

/** GET /offers */
const listOffers = asyncHandler(async (req, res) => {
  const result = await offerService.getOffers(req.query);
  sendPaginated(res, { data: result.items, total: result.total, page: result.page, limit: result.limit, message: 'Offers fetched' });
});

/** POST /offers */
const createOffer = asyncHandler(async (req, res) => {
  await offerService.createOffer(req.body);
  sendCreated(res, null, 'Offer created');
});

/** PUT /offers/:id */
const updateOffer = asyncHandler(async (req, res) => {
  await offerService.updateOffer(req.params.id, req.body);
  sendSuccess(res, null, 'Offer updated');
});

/** DELETE /offers/:id */
const deleteOffer = asyncHandler(async (req, res) => {
  await offerService.deleteOffer(req.params.id);
  sendSuccess(res, null, 'Offer deleted');
});

/** PATCH /offers/:id/toggle */
const toggleOffer = asyncHandler(async (req, res) => {
  await offerService.toggleOffer(req.params.id);
  sendSuccess(res, null, 'Offer status toggled');
});

module.exports = {
  getActiveOffers,
  validateOffer,
  listOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOffer,
};

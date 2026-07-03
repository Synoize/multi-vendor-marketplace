/**
 * Damini Marketplace - Review Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendError } = require('../utils/response.util');
const reviewService = require('../services/review.service');

/**
 * POST /reviews/:productId
 * Create or update a review for a product
 */
const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;
  await reviewService.createReview(userId, productId, req.body);
  sendCreated(res, null, 'Review submitted successfully');
});

/**
 * GET /reviews/:productId
 * Get paginated reviews for a product
 */
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, rating } = req.query;
  const data = await reviewService.getProductReviews(productId, {
    page: parseInt(page),
    limit: parseInt(limit),
    rating: rating ? parseInt(rating) : undefined,
  });
  sendSuccess(res, data);
});

/**
 * DELETE /reviews/:reviewId
 * Delete own review
 */
const deleteReview = asyncHandler(async (req, res) => {
  await reviewService.deleteReview(req.params.reviewId, req.user.id);
  sendSuccess(res, null, 'Review deleted successfully');
});

module.exports = { createReview, getProductReviews, deleteReview };

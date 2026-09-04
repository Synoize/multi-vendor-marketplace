/**
 * Damini Marketplace - Review Routes
 */

const express = require('express');
const { createReview, getProductReviews, deleteReview } = require('../controllers/review.controller');
const { protect } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { uploadReviewImages } = require('../middlewares/upload.middleware');
const { z } = require('zod');

const router = express.Router();

const reviewSchema = z.object({
  orderItemId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().max(2000).optional(),
});

// GET /reviews/:productId — public
router.get('/:productId', rateLimit('read'), getProductReviews);

// POST /reviews/:productId — authenticated
router.post('/:productId', protect, rateLimit('review'), uploadReviewImages, createReview);

// DELETE /reviews/:reviewId — authenticated, own review
router.delete('/:reviewId', protect, rateLimit('review'), deleteReview);

module.exports = router;

/**
 * Damini Marketplace - Brand Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const categoryController = require('../controllers/category.controller');

const brandRouter = express.Router();

/** GET /brands — ?all=1 returns every brand (incl. inactive) for admin panel */
brandRouter.get('/', rateLimit('read'), categoryController.listBrands);

/** GET /brands/:slug */
brandRouter.get('/:slug', rateLimit('read'), categoryController.getBrandBySlug);

/** POST /brands — admin */
brandRouter.post('/', protect, requireRole('admin'), rateLimit('admin'), categoryController.createBrand);

/** PUT /brands/:id */
brandRouter.put('/:id', protect, requireRole('admin'), rateLimit('admin'), categoryController.updateBrand);

/** DELETE /brands/:id */
brandRouter.delete('/:id', protect, requireRole('admin'), rateLimit('admin'), categoryController.deleteBrand);

module.exports = brandRouter;

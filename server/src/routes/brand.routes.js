/**
 * Damini Marketplace - Brand Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const categoryController = require('../controllers/category.controller');

const brandRouter = express.Router();

/** GET /brands — ?all=1 returns every brand (incl. inactive) for admin panel */
brandRouter.get('/', categoryController.listBrands);

/** GET /brands/:slug */
brandRouter.get('/:slug', categoryController.getBrandBySlug);

/** POST /brands — admin */
brandRouter.post('/', protect, requireRole('admin'), categoryController.createBrand);

/** PUT /brands/:id */
brandRouter.put('/:id', protect, requireRole('admin'), categoryController.updateBrand);

/** DELETE /brands/:id */
brandRouter.delete('/:id', protect, requireRole('admin'), categoryController.deleteBrand);

module.exports = brandRouter;

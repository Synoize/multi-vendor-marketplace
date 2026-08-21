/**
 * Damini Marketplace - Category Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const categoryController = require('../controllers/category.controller');

const categoryRouter = express.Router();

/** GET /categories — hierarchical tree (?all=1 includes inactive) */
categoryRouter.get('/', categoryController.listCategories);

/** GET /categories/:slug */
categoryRouter.get('/:slug', categoryController.getCategoryBySlug);

/** POST /categories — admin */
categoryRouter.post('/', protect, requireRole('admin'), categoryController.createCategory);

/** PUT /categories/:id */
categoryRouter.put('/:id', protect, requireRole('admin'), categoryController.updateCategory);

/** DELETE /categories/:id */
categoryRouter.delete('/:id', protect, requireRole('admin'), categoryController.deleteCategory);

module.exports = { categoryRouter };

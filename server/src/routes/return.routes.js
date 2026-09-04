/**
 * Damini Marketplace - Return Routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const returnController = require('../controllers/return.controller');

// ─── ROUTES ───────────────────────────────────────────────────────────────────
router.post('/', protect, requireRole('customer'), rateLimit('write'), returnController.requestReturn);
router.get('/my', protect, requireRole('customer'), rateLimit('read'), returnController.getMyReturns);
router.get('/vendor', protect, requireRole('vendor'), rateLimit('read'), returnController.getVendorReturns);
router.get('/', protect, requireRole('admin'), rateLimit('admin'), returnController.getAllReturns);
router.get('/:id', protect, rateLimit('read'), returnController.getReturnById);
router.patch('/:id/status', protect, requireRole('admin', 'vendor'), rateLimit('write'), returnController.updateReturnStatus);

module.exports = router;

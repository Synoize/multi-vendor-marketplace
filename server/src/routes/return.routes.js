/**
 * Damini Marketplace - Return Routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middlewares/auth.middleware');
const returnController = require('../controllers/return.controller');

// ─── ROUTES ───────────────────────────────────────────────────────────────────
router.post('/', protect, requireRole('customer'), returnController.requestReturn);
router.get('/my', protect, requireRole('customer'), returnController.getMyReturns);
router.get('/vendor', protect, requireRole('vendor'), returnController.getVendorReturns);
router.get('/', protect, requireRole('admin'), returnController.getAllReturns);
router.get('/:id', protect, returnController.getReturnById);
router.patch('/:id/status', protect, requireRole('admin', 'vendor'), returnController.updateReturnStatus);

module.exports = router;

/**
 * Damini Marketplace - Return Routes & Controller
 */

'use strict';

const express = require('express');
const router = express.Router();
const returnService = require('../services/return.service');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response.util');

// ─── CONTROLLERS ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/returns
 * Customer submits a return request.
 */
async function requestReturn(req, res, next) {
  try {
    const { orderItemId, reason, description, images, type } = req.body;
    if (!orderItemId || !reason) return sendError(res, 'orderItemId and reason are required', 400);

    const ret = await returnService.requestReturn(orderItemId, req.user.id, { reason, description, images, type });
    return sendCreated(res, { return: ret }, 'Return request submitted');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/returns/my
 * Customer gets their own return requests.
 */
async function getMyReturns(req, res, next) {
  try {
    const { page, limit, status } = req.query;
    const { returns, total } = await returnService.getReturns({
      userId: req.user.id, status, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
    });
    return sendPaginated(res, { data: returns, total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/returns/vendor
 * Vendor gets returns for their products.
 */
async function getVendorReturns(req, res, next) {
  try {
    const vendor = await require('../database/connection').queryOne(
      'SELECT id FROM vendors WHERE user_id = ?', [req.user.id]
    );
    if (!vendor) return sendError(res, 'Vendor not found', 404);

    const { page, limit, status } = req.query;
    const { returns, total } = await returnService.getReturns({
      vendorId: vendor.id, status, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
    });
    return sendPaginated(res, { data: returns, total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/returns/
 * Admin gets all returns.
 */
async function getAllReturns(req, res, next) {
  try {
    const { page, limit, status, userId, vendorId } = req.query;
    const { returns, total } = await returnService.getReturns({
      status, userId, vendorId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    return sendPaginated(res, { data: returns, total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/returns/:id
 * Get a single return by ID.
 */
async function getReturnById(req, res, next) {
  try {
    const ret = await returnService.getReturnById(req.params.id);
    // Authorization check
    if (req.user.role === 'customer' && ret.user_id !== req.user.id) {
      return sendError(res, 'Unauthorized', 403);
    }
    return sendSuccess(res, { return: ret }, 'Return retrieved');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/returns/:id/status
 * Admin/vendor updates return status.
 */
async function updateReturnStatus(req, res, next) {
  try {
    const { status, adminNotes } = req.body;
    const validStatuses = ['under_review', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'quality_check', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }
    const updated = await returnService.updateReturnStatus(req.params.id, status, adminNotes);
    return sendSuccess(res, { return: updated }, 'Return status updated');
  } catch (err) {
    next(err);
  }
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────
router.post('/', protect, requireRole('customer'), requestReturn);
router.get('/my', protect, requireRole('customer'), getMyReturns);
router.get('/vendor', protect, requireRole('vendor'), getVendorReturns);
router.get('/', protect, requireRole('admin'), getAllReturns);
router.get('/:id', protect, getReturnById);
router.patch('/:id/status', protect, requireRole('admin', 'vendor'), updateReturnStatus);

module.exports = router;

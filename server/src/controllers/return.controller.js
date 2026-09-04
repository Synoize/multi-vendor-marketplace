/**
 * Damini Marketplace - Return Controller
 */

'use strict';

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response.util');
const { queryOne } = require('../database/connection');
const returnService = require('../services/return.service');

/**
 * POST /api/v1/returns
 * Customer submits a return request.
 */
const requestReturn = asyncHandler(async (req, res) => {
  const { orderItemId, reason, description, images, type } = req.body;
  if (!orderItemId || !reason) return sendError(res, 'orderItemId and reason are required', 400);

  const ret = await returnService.requestReturn(orderItemId, req.user.id, { reason, description, images, type });
  return sendCreated(res, { return: ret }, 'Return request submitted');
});

/**
 * GET /api/v1/returns/my
 * Customer gets their own return requests.
 */
const getMyReturns = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const { returns, total } = await returnService.getReturns({
    userId: req.user.id, status, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
  });
  return sendPaginated(res, { data: returns, total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
});

/**
 * GET /api/v1/returns/vendor
 * Vendor gets returns for their products.
 */
const getVendorReturns = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  if (!vendor) return sendError(res, 'Vendor not found', 404);

  const { page, limit, status } = req.query;
  const { returns, total } = await returnService.getReturns({
    vendorId: vendor.id, status, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
  });
  return sendPaginated(res, { data: returns, total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
});

/**
 * GET /api/v1/returns/
 * Admin gets all returns.
 */
const getAllReturns = asyncHandler(async (req, res) => {
  const { page, limit, status, userId, vendorId } = req.query;
  const { returns, total } = await returnService.getReturns({
    status, userId, vendorId,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });
  return sendPaginated(res, { data: returns, total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
});

/**
 * GET /api/v1/returns/:id
 * Get a single return by ID.
 */
const getReturnById = asyncHandler(async (req, res) => {
  const ret = await returnService.getReturnById(req.params.id);
  // Authorization check
  if (req.user.role === 'customer' && ret.user_id !== req.user.id) {
    return sendError(res, 'Unauthorized', 403);
  }
  return sendSuccess(res, { return: ret }, 'Return retrieved');
});

/**
 * PATCH /api/v1/returns/:id/status
 * Admin/vendor updates return status.
 */
const updateReturnStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;
  const validStatuses = ['under_review', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'quality_check', 'completed', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }
  const updated = await returnService.updateReturnStatus(req.params.id, status, adminNotes);
  return sendSuccess(res, { return: updated }, 'Return status updated');
});

module.exports = {
  requestReturn,
  getMyReturns,
  getVendorReturns,
  getAllReturns,
  getReturnById,
  updateReturnStatus,
};

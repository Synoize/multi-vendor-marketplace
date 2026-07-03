/**
 * Damini Marketplace - Shipment Routes & Controller
 * Vendor: create shipment, assign AWB, generate label, track
 * Admin:  list all shipments, get by ID
 */

'use strict';

const express = require('express');
const router = express.Router();
const shipmentService = require('../services/shipment.service');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response.util');
const { queryRows, queryOne } = require('../database/connection');
const { getPagination } = require('../utils/pagination.util');
const logger = require('../utils/logger.util');

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/shipments/:orderId/create
 * Vendor creates a new shipment for an order.
 */
async function createShipment(req, res, next) {
  try {
    const { orderId } = req.params;
    const { orderItemId } = req.body; // optional

    // Resolve vendor profile
    const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
    if (!vendor) return sendError(res, 'Vendor profile not found', 404);

    const shipment = await shipmentService.createShipment(orderId, orderItemId || null, vendor.id);
    return sendCreated(res, { shipment }, 'Shipment created successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/shipments/:shipmentId/awb
 * Vendor assigns courier and generates AWB number.
 */
async function generateAWB(req, res, next) {
  try {
    const { shipmentId } = req.params;
    const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
    if (!vendor) return sendError(res, 'Vendor profile not found', 404);

    // Ensure shipment belongs to this vendor
    const shipment = await queryOne(
      'SELECT * FROM shipments WHERE id = ? AND vendor_id = ?',
      [shipmentId, vendor.id]
    );
    if (!shipment) return sendError(res, 'Shipment not found', 404);

    const updated = await shipmentService.generateAWB(shipmentId);
    return sendSuccess(res, { shipment: updated }, 'AWB generated successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/shipments/:shipmentId/label
 * Vendor generates shipping label PDF.
 */
async function generateLabel(req, res, next) {
  try {
    const { shipmentId } = req.params;
    const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
    if (!vendor) return sendError(res, 'Vendor profile not found', 404);

    const shipment = await queryOne(
      'SELECT * FROM shipments WHERE id = ? AND vendor_id = ?',
      [shipmentId, vendor.id]
    );
    if (!shipment) return sendError(res, 'Shipment not found', 404);

    const result = await shipmentService.generateLabel(shipmentId);
    return sendSuccess(res, result, 'Label generated successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/shipments/:shipmentId/manifest
 * Vendor generates manifest for pickup.
 */
async function generateManifest(req, res, next) {
  try {
    const { shipmentId } = req.params;
    const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
    if (!vendor) return sendError(res, 'Vendor profile not found', 404);

    const shipment = await queryOne(
      'SELECT * FROM shipments WHERE id = ? AND vendor_id = ?',
      [shipmentId, vendor.id]
    );
    if (!shipment) return sendError(res, 'Shipment not found', 404);

    const result = await shipmentService.generateManifest(shipmentId);
    return sendSuccess(res, result, 'Manifest generated');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/shipments/:awb/track
 * Public/vendor — track shipment by AWB code.
 */
async function trackShipment(req, res, next) {
  try {
    const { awb } = req.params;
    const tracking = await shipmentService.trackShipment(awb);
    return sendSuccess(res, { tracking }, 'Tracking info retrieved');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/shipments/
 * Admin — list all shipments with filters.
 */
async function getAllShipments(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { status, vendorId, orderId } = req.query;

    const conditions = [];
    const params = [];

    if (status) { conditions.push('s.status = ?'); params.push(status); }
    if (vendorId) { conditions.push('s.vendor_id = ?'); params.push(vendorId); }
    if (orderId) { conditions.push('s.order_id = ?'); params.push(orderId); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [shipments, countRows] = await Promise.all([
      queryRows(
        `SELECT s.*, o.order_number, v.business_name AS vendor_name
         FROM shipments s
         JOIN orders o ON o.id = s.order_id
         JOIN vendors v ON v.id = s.vendor_id
         ${where}
         ORDER BY s.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      queryRows(`SELECT COUNT(*) AS total FROM shipments s ${where}`, params),
    ]);

    return sendPaginated(res, {
      data: shipments,
      total: countRows[0]?.total || 0,
      page,
      limit,
      message: 'Shipments retrieved',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/shipments/detail/:id
 * Admin — get shipment by internal ID.
 */
async function getShipmentById(req, res, next) {
  try {
    const shipment = await queryOne(
      `SELECT s.*, o.order_number, v.business_name AS vendor_name
       FROM shipments s
       JOIN orders o ON o.id = s.order_id
       JOIN vendors v ON v.id = s.vendor_id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (!shipment) return sendError(res, 'Shipment not found', 404);
    return sendSuccess(res, { shipment }, 'Shipment retrieved');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/shipments/serviceability
 * Check courier serviceability.
 */
async function checkServiceability(req, res, next) {
  try {
    const { pickupPincode, deliveryPincode, weight = 0.5 } = req.query;
    if (!pickupPincode || !deliveryPincode) {
      return sendError(res, 'pickupPincode and deliveryPincode are required', 400);
    }
    const couriers = await shipmentService.getAvailableCouriers(pickupPincode, deliveryPincode, parseFloat(weight));
    return sendSuccess(res, { couriers }, 'Serviceability checked');
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Admin routes
router.get('/', protect, requireRole('admin'), getAllShipments);
router.get('/detail/:id', protect, requireRole('admin'), getShipmentById);

// Serviceability (vendor + admin)
router.get('/serviceability', protect, requireRole('vendor', 'admin'), checkServiceability);

// Tracking — authenticated users
router.get('/:awb/track', protect, trackShipment);

// Vendor routes
router.post('/:orderId/create', protect, requireRole('vendor'), createShipment);
router.post('/:shipmentId/awb', protect, requireRole('vendor'), generateAWB);
router.post('/:shipmentId/label', protect, requireRole('vendor'), generateLabel);
router.post('/:shipmentId/manifest', protect, requireRole('vendor'), generateManifest);

module.exports = router;

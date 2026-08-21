/**
 * Damini Marketplace - Shipment Routes
 * Vendor: create shipment, assign AWB, generate label, track
 * Admin:  list all shipments, get by ID
 */

'use strict';

const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middlewares/auth.middleware');
const shipmentController = require('../controllers/shipment.controller');

// Admin routes
router.get('/', protect, requireRole('admin'), shipmentController.getAllShipments);
router.get('/detail/:id', protect, requireRole('admin'), shipmentController.getShipmentById);

// Serviceability (vendor + admin)
router.get('/serviceability', protect, requireRole('vendor', 'admin'), shipmentController.checkServiceability);

// Tracking — authenticated users
router.get('/:awb/track', protect, shipmentController.trackShipment);

// Vendor routes
router.post('/:orderId/create', protect, requireRole('vendor'), shipmentController.createShipment);
router.post('/:shipmentId/awb', protect, requireRole('vendor'), shipmentController.generateAWB);
router.post('/:shipmentId/label', protect, requireRole('vendor'), shipmentController.generateLabel);
router.post('/:shipmentId/manifest', protect, requireRole('vendor'), shipmentController.generateManifest);

module.exports = router;

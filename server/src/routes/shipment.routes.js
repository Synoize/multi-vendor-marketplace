/**
 * Damini Marketplace - Shipment Routes
 * Vendor: create shipment, assign AWB, generate label, track
 * Admin:  list all shipments, get by ID
 */

'use strict';

const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { attachVendor } = require('../middlewares/vendor.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const shipmentController = require('../controllers/shipment.controller');

// Admin routes
router.get('/', protect, requireRole('admin'), rateLimit('admin'), shipmentController.getAllShipments);
router.get('/detail/:id', protect, requireRole('admin'), rateLimit('admin'), shipmentController.getShipmentById);

// Serviceability (vendor + admin)
router.get('/serviceability', protect, requireRole('vendor', 'admin'), rateLimit('read'), shipmentController.checkServiceability);

// Vendor shipments list
router.get('/vendor', protect, requireRole('vendor'), attachVendor, rateLimit('read'), shipmentController.getVendorShipments);

// Tracking — authenticated users
router.get('/:awb/track', protect, rateLimit('read'), shipmentController.trackShipment);

// Vendor routes
router.post('/:orderId/create', protect, requireRole('vendor'), rateLimit('write'), shipmentController.createShipment);
router.post('/:shipmentId/awb', protect, requireRole('vendor'), rateLimit('write'), shipmentController.generateAWB);
router.post('/:shipmentId/label', protect, requireRole('vendor'), rateLimit('write'), shipmentController.generateLabel);
router.post('/:shipmentId/manifest', protect, requireRole('vendor'), rateLimit('write'), shipmentController.generateManifest);

module.exports = router;

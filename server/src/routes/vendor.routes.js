/**
 * Damini Marketplace - Vendor Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { attachVendor } = require('../middlewares/vendor.middleware');
const { uploadKYC, uploadStoreBranding } = require('../middlewares/upload.middleware');
const vendorController = require('../controllers/vendor.controller');

const router = express.Router();
const vendorProtect = [protect, requireRole('vendor'), attachVendor];

/** GET /vendors/profile */
router.get('/profile', ...vendorProtect, vendorController.getProfile);

/** PUT /vendors/profile */
router.put('/profile', ...vendorProtect, vendorController.updateProfile);

/** POST /vendors/branding — upload store logo / banner */
router.post('/branding', ...vendorProtect, uploadStoreBranding, vendorController.updateBranding);

// ─── Pending Update (approval-required) ───────────────────────────────────────

/** POST /vendors/pending-update — queue important field changes for admin approval */
router.post('/pending-update', ...vendorProtect, vendorController.createPendingUpdate);

/** GET /vendors/pending-updates — list this vendor's update requests */
router.get('/pending-updates', ...vendorProtect, vendorController.getPendingUpdates);

/** DELETE /vendors/pending-updates/:id — cancel an own pending update */
router.delete('/pending-updates/:id', ...vendorProtect, vendorController.cancelPendingUpdate);

/** POST /vendors/pending-documents — queue KYC document changes for admin approval */
router.post('/pending-documents', ...vendorProtect, uploadKYC, vendorController.createPendingDocuments);

/** POST /vendors/send-business-otp — send OTP to business email (no vendor role needed) */
router.post('/send-business-otp', protect, vendorController.sendBusinessOTP);

/** POST /vendors/verify-business-otp — verify OTP for business email (no vendor role needed) */
router.post('/verify-business-otp', protect, vendorController.verifyBusinessOTP);

/** POST /vendors/kyc — submit KYC (creates vendor record if needed, grants vendor role) */
router.post('/kyc', protect, uploadKYC, vendorController.submitKYC);

/** GET /vendors/kyc/:filename — serve decrypted KYC file */
router.get('/kyc/:filename', ...vendorProtect, vendorController.getKYCDocument);

/** GET /vendors/dashboard */
router.get('/dashboard', ...vendorProtect, vendorController.getDashboard);

/** GET /vendors/products */
router.get('/products', ...vendorProtect, vendorController.getProducts);

/** GET /vendors/orders */
router.get('/orders', ...vendorProtect, vendorController.getOrders);

/** GET /vendors/payouts */
router.get('/payouts', ...vendorProtect, vendorController.getPayouts);

/** GET /vendors/analytics */
router.get('/analytics', ...vendorProtect, vendorController.getAnalytics);

/** GET /vendors/notifications */
router.get('/notifications', ...vendorProtect, vendorController.getNotifications);

// ─── Public vendor store ──────────────────────────────────────────────────────
/** GET /vendors/:vendorId/store */
router.get('/:vendorId/store', vendorController.getStore);

module.exports = router;

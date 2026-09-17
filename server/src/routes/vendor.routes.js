/**
 * Damini Marketplace - Vendor Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const { attachVendor } = require('../middlewares/vendor.middleware');
const { uploadKYC, uploadStoreBranding } = require('../middlewares/upload.middleware');
const vendorController = require('../controllers/vendor.controller');
const categoryController = require('../controllers/category.controller');

const router = express.Router();
const vendorProtect = [protect, requireRole('vendor'), attachVendor];

/** GET /vendors/profile */
router.get('/profile', ...vendorProtect, rateLimit('read'), vendorController.getProfile);

/** POST /vendors/categories — create a custom child category under an existing one */
router.post('/categories', ...vendorProtect, rateLimit('write'), categoryController.createVendorCategory);

/** PUT /vendors/profile */
router.put('/profile', ...vendorProtect, rateLimit('write'), vendorController.updateProfile);

/** POST /vendors/branding — upload store logo / banner */
router.post('/branding', ...vendorProtect, rateLimit('upload'), uploadStoreBranding, vendorController.updateBranding);

// ─── Pending Update (approval-required) ───────────────────────────────────────

/** POST /vendors/pending-update — queue important field changes for admin approval */
router.post('/pending-update', ...vendorProtect, rateLimit('write'), vendorController.createPendingUpdate);

/** GET /vendors/pending-updates — list this vendor's update requests */
router.get('/pending-updates', ...vendorProtect, rateLimit('read'), vendorController.getPendingUpdates);

/** DELETE /vendors/pending-updates/:id — cancel an own pending update */
router.delete('/pending-updates/:id', ...vendorProtect, rateLimit('write'), vendorController.cancelPendingUpdate);

/** POST /vendors/pending-documents — queue KYC document changes for admin approval */
router.post('/pending-documents', ...vendorProtect, rateLimit('upload'), uploadKYC, vendorController.createPendingDocuments);

/** POST /vendors/send-business-otp — send OTP to business email (no vendor role needed) */
router.post('/send-business-otp', protect, rateLimit('otp'), vendorController.sendBusinessOTP);

/** POST /vendors/verify-business-otp — verify OTP for business email (no vendor role needed) */
router.post('/verify-business-otp', protect, rateLimit('otp'), vendorController.verifyBusinessOTP);

/** POST /vendors/kyc — submit KYC (creates vendor record if needed, grants vendor role) */
router.post('/kyc', protect, rateLimit('write'), uploadKYC, vendorController.submitKYC);

/** GET /vendors/kyc — return current user's existing vendor data for re-apply prefill */
router.get('/kyc', protect, rateLimit('read'), vendorController.getKYC);

/** GET /vendors/kyc/:filename — serve decrypted KYC file */
router.get('/kyc/:filename', ...vendorProtect, rateLimit('read'), vendorController.getKYCDocument);

/** GET /vendors/dashboard */
router.get('/dashboard', ...vendorProtect, rateLimit('read'), vendorController.getDashboard);

/** GET /vendors/products */
router.get('/products', ...vendorProtect, rateLimit('read'), vendorController.getProducts);

/** GET /vendors/products/by-barcode/:code */
router.get('/products/by-barcode/:code', ...vendorProtect, rateLimit('read'), vendorController.getProductByBarcode);

/** GET /vendors/orders */
router.get('/orders', ...vendorProtect, rateLimit('read'), vendorController.getOrders);

/** GET /vendors/payouts */
router.get('/payouts', ...vendorProtect, rateLimit('read'), vendorController.getPayouts);

/** GET /vendors/analytics */
router.get('/analytics', ...vendorProtect, rateLimit('read'), vendorController.getAnalytics);

/** GET /vendors/notifications */
router.get('/notifications', ...vendorProtect, rateLimit('read'), vendorController.getNotifications);

// ─── Public vendor store ──────────────────────────────────────────────────────
/** GET /vendors/:vendorId/store */
router.get('/:vendorId/store', rateLimit('read'), vendorController.getStore);

module.exports = router;

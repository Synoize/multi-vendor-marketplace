/**
 * Damini Marketplace - Admin Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const adminController = require('../controllers/admin.controller');

const router = express.Router();
router.use(protect, requireRole('admin'));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', adminController.getDashboard);
router.get('/dashboard/pending-counts', adminController.getPendingCounts);

// ─── Vendor Management ────────────────────────────────────────────────────────
router.get('/vendors', adminController.listVendors);
router.get('/vendors/pending-updates', adminController.listVendorPendingUpdates);
router.post('/vendors/pending-updates/:id/approve', adminController.approveVendorPendingUpdate);
router.post('/vendors/pending-updates/:id/reject', adminController.rejectVendorPendingUpdate);
router.get('/vendors/:id', adminController.getVendorById);
router.get('/vendors/:id/documents/:filename', adminController.getVendorDocument);
router.patch('/vendors/:id/approve', adminController.approveVendor);
router.patch('/vendors/:id/reject', adminController.rejectVendor);
router.patch('/vendors/:id/suspend', adminController.suspendVendor);
router.patch('/vendors/:id/unsuspend', adminController.unsuspendVendor);

// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users', adminController.listUsers);
router.patch('/users/:id/ban', adminController.banUser);
router.patch('/users/:id/unban', adminController.unbanUser);

// ─── Product Management ───────────────────────────────────────────────────────
router.get('/products', adminController.listProducts);

// ─── Payouts ──────────────────────────────────────────────────────────────────
router.get('/payouts', adminController.listPayouts);
router.post('/payouts/release', adminController.releasePayout);

// ─── Platform Settings ────────────────────────────────────────────────────────
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// ─── Disputes ─────────────────────────────────────────────────────────────────
router.get('/disputes', adminController.listDisputes);
router.patch('/disputes/:id/resolve', adminController.resolveDispute);

// ─── Festival Sales ───────────────────────────────────────────────────────────
router.get('/festival-sales', adminController.listFestivalSales);
router.post('/festival-sales', adminController.createFestivalSale);
router.put('/festival-sales/:id', adminController.updateFestivalSale);
router.delete('/festival-sales/:id', adminController.deleteFestivalSale);

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports/sales', adminController.getSalesReport);
router.get('/reports/vendors', adminController.getVendorsReport);

module.exports = router;

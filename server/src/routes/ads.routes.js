/**
 * Damini Marketplace - Ads Routes
 * Full Ads Manager: campaigns, tracking, wallets and admin review.
 */

const express = require('express');
const { protect, requireRole, optionalAuth } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const adsController = require('../controllers/ads.controller');

const router = express.Router();

// ─── Public tracking (anonymous + authenticated visitors) ───────────────────
router.get('/active', rateLimit('read'), adsController.getActiveAds);
router.post('/impression', rateLimit('read'), adsController.trackImpression);
router.post('/click', optionalAuth, rateLimit('read'), adsController.trackClick);

// ─── Vendor ─────────────────────────────────────────────────────────────────
router.get('/vendor', protect, requireRole('vendor'), rateLimit('read'), adsController.getVendorCampaigns);
router.post('/vendor', protect, requireRole('vendor'), rateLimit('write'), adsController.createCampaign);

router.get('/vendor/summary', protect, requireRole('vendor'), rateLimit('read'), adsController.getVendorSummary);
router.get('/vendor/analytics', protect, requireRole('vendor'), rateLimit('read'), adsController.getVendorAnalytics);
router.get('/vendor/wallet', protect, requireRole('vendor'), rateLimit('read'), adsController.getVendorWallet);
router.get('/vendor/alert-preferences', protect, requireRole('vendor'), rateLimit('read'), adsController.getAlertPreferences);
router.put('/vendor/alert-preferences', protect, requireRole('vendor'), rateLimit('write'), adsController.updateAlertPreferences);

router.get('/vendor/:id/analytics', protect, requireRole('vendor'), rateLimit('read'), adsController.getCampaignAnalytics);
router.patch('/vendor/:id/pause', protect, requireRole('vendor'), rateLimit('write'), adsController.pauseCampaign);
router.patch('/vendor/:id/resume', protect, requireRole('vendor'), rateLimit('write'), adsController.resumeCampaign);
router.delete('/vendor/:id', protect, requireRole('vendor'), rateLimit('write'), adsController.deleteCampaign);

// ─── Admin ──────────────────────────────────────────────────────────────────
router.get('/admin', protect, requireRole('admin'), rateLimit('admin'), adsController.getAllCampaigns);
router.patch('/admin/:id/approve', protect, requireRole('admin'), rateLimit('admin'), adsController.approveCampaign);
router.patch('/admin/:id/reject', protect, requireRole('admin'), rateLimit('admin'), adsController.rejectCampaign);

module.exports = router;
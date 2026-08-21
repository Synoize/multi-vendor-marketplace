/**
 * Damini Marketplace - Banner, Video, Ads, Notification, Support, Report, Festival Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { uploadBanner } = require('../middlewares/upload.middleware');
const bannerController = require('../controllers/banner.controller');

// ─── BANNER ROUTES ────────────────────────────────────────────────────────────
const bannerRouter = express.Router();

bannerRouter.get('/', bannerController.listBanners);
bannerRouter.post('/', protect, requireRole('admin'), uploadBanner, bannerController.createBanner);
bannerRouter.put('/:id', protect, requireRole('admin'), bannerController.updateBanner);
bannerRouter.delete('/:id', protect, requireRole('admin'), bannerController.deleteBanner);

// ─── VIDEO ROUTES ─────────────────────────────────────────────────────────────
const videoRouter = express.Router();

videoRouter.get('/', bannerController.listVideos);
videoRouter.post('/', protect, requireRole('admin'), bannerController.createVideo);
videoRouter.put('/:id', protect, requireRole('admin'), bannerController.updateVideo);
videoRouter.delete('/:id', protect, requireRole('admin'), bannerController.deleteVideo);

// ─── ADS ROUTES ───────────────────────────────────────────────────────────────
const adsRouter = express.Router();

/** GET /ads/active — for homepage sponsored products */
adsRouter.get('/active', bannerController.getActiveAds);

/** POST /ads/impression — track impression */
adsRouter.post('/impression', bannerController.trackImpression);

/** POST /ads/click — track click and deduct budget */
adsRouter.post('/click', protect, bannerController.trackClick);

/** GET /ads/vendor — vendor's campaigns */
adsRouter.get('/vendor', protect, requireRole('vendor'), bannerController.getVendorCampaigns);

/** POST /ads/vendor — create campaign */
adsRouter.post('/vendor', protect, requireRole('vendor'), bannerController.createCampaign);

/** GET /ads/vendor/:id/analytics */
adsRouter.get('/vendor/:id/analytics', protect, requireRole('vendor'), bannerController.getCampaignAnalytics);

/** PATCH /ads/vendor/:id/pause */
adsRouter.patch('/vendor/:id/pause', protect, requireRole('vendor'), bannerController.pauseCampaign);

/** PATCH /ads/vendor/:id/resume */
adsRouter.patch('/vendor/:id/resume', protect, requireRole('vendor'), bannerController.resumeCampaign);

// Admin ad routes
adsRouter.get('/admin', protect, requireRole('admin'), bannerController.getAllCampaigns);
adsRouter.patch('/admin/:id/approve', protect, requireRole('admin'), bannerController.approveCampaign);
adsRouter.patch('/admin/:id/reject', protect, requireRole('admin'), bannerController.rejectCampaign);

// ─── NOTIFICATION ROUTES ──────────────────────────────────────────────────────
const notificationRouter = express.Router();
notificationRouter.use(protect);

notificationRouter.get('/', bannerController.listNotifications);
notificationRouter.get('/unread-count', bannerController.getUnreadCount);
notificationRouter.patch('/read-all', bannerController.markAllAsRead);
notificationRouter.patch('/:id/read', bannerController.markAsRead);
notificationRouter.delete('/:id', bannerController.deleteNotification);

// ─── SUPPORT ROUTES ───────────────────────────────────────────────────────────
const supportRouter = express.Router();

supportRouter.post('/tickets', protect, bannerController.createTicket);
supportRouter.get('/tickets', protect, bannerController.listTickets);
supportRouter.get('/tickets/:id', protect, bannerController.getTicketById);
supportRouter.post('/tickets/:id/reply', protect, bannerController.replyToTicket);
supportRouter.patch('/tickets/:id/close', protect, requireRole('admin'), bannerController.closeTicket);

// ─── REPORT ROUTES ────────────────────────────────────────────────────────────
const reportRouter = express.Router();
reportRouter.use(protect, requireRole('admin'));

reportRouter.get('/sales', bannerController.getSalesReport);
reportRouter.get('/vendors', bannerController.getVendorsReport);
reportRouter.get('/users', bannerController.getUsersReport);
reportRouter.get('/ads', bannerController.getAdsReport);

// ─── FESTIVAL SALE ROUTES (Public) ────────────────────────────────────────────
const festivalRouter = express.Router();

festivalRouter.get('/active', bannerController.getActiveFestivalSales);

module.exports = { bannerRouter, videoRouter, adsRouter, notificationRouter, supportRouter, reportRouter, festivalRouter };

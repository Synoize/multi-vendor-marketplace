/**
 * Damini Marketplace - Banner, Video, Ads, Notification, Support, Report, Festival Routes
 */

const express = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const { uploadBanner } = require('../middlewares/upload.middleware');
const bannerController = require('../controllers/banner.controller');
const adsController = require('../controllers/ads.controller');

// ─── BANNER ROUTES ────────────────────────────────────────────────────────────
const bannerRouter = express.Router();

bannerRouter.get('/', rateLimit('read'), bannerController.listBanners);
bannerRouter.post('/', protect, requireRole('admin'), rateLimit('admin'), uploadBanner, bannerController.createBanner);
bannerRouter.put('/:id', protect, requireRole('admin'), rateLimit('admin'), bannerController.updateBanner);
bannerRouter.delete('/:id', protect, requireRole('admin'), rateLimit('admin'), bannerController.deleteBanner);

// ─── VIDEO ROUTES ─────────────────────────────────────────────────────────────
const videoRouter = express.Router();

videoRouter.get('/', rateLimit('read'), bannerController.listVideos);
videoRouter.post('/', protect, requireRole('admin'), rateLimit('admin'), bannerController.createVideo);
videoRouter.put('/:id', protect, requireRole('admin'), rateLimit('admin'), bannerController.updateVideo);
videoRouter.delete('/:id', protect, requireRole('admin'), rateLimit('admin'), bannerController.deleteVideo);

// ─── NOTIFICATION ROUTES ──────────────────────────────────────────────────────
const notificationRouter = express.Router();
notificationRouter.use(protect);

notificationRouter.get('/', rateLimit('read'), bannerController.listNotifications);
notificationRouter.get('/unread-count', rateLimit('read'), bannerController.getUnreadCount);
notificationRouter.patch('/read-all', rateLimit('write'), bannerController.markAllAsRead);
notificationRouter.patch('/:id/read', rateLimit('write'), bannerController.markAsRead);
notificationRouter.delete('/:id', rateLimit('write'), bannerController.deleteNotification);

// ─── SUPPORT ROUTES ───────────────────────────────────────────────────────────
const supportRouter = express.Router();

supportRouter.post('/tickets', protect, rateLimit('write'), bannerController.createTicket);
supportRouter.get('/tickets', protect, rateLimit('read'), bannerController.listTickets);
supportRouter.get('/tickets/:id', protect, rateLimit('read'), bannerController.getTicketById);
supportRouter.post('/tickets/:id/reply', protect, rateLimit('write'), bannerController.replyToTicket);
supportRouter.patch('/tickets/:id/close', protect, requireRole('admin'), rateLimit('admin'), bannerController.closeTicket);

// ─── REPORT ROUTES ────────────────────────────────────────────────────────────
const reportRouter = express.Router();
reportRouter.use(protect, requireRole('admin'));

reportRouter.get('/sales', rateLimit('admin'), bannerController.getSalesReport);
reportRouter.get('/vendors', rateLimit('admin'), bannerController.getVendorsReport);
reportRouter.get('/users', rateLimit('admin'), bannerController.getUsersReport);
reportRouter.get('/ads', rateLimit('admin'), adsController.getAdsReport);

// ─── FESTIVAL SALE ROUTES (Public) ────────────────────────────────────────────
const festivalRouter = express.Router();

festivalRouter.get('/active', rateLimit('read'), bannerController.getActiveFestivalSales);

module.exports = { bannerRouter, videoRouter, notificationRouter, supportRouter, reportRouter, festivalRouter };

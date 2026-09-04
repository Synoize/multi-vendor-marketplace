/**
 * Damini Marketplace - Ads Controller
 * Full Ads Manager: campaigns, wallets, analytics, tracking and admin review.
 */

const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendError } = require('../utils/response.util');
const { query, queryOne, queryRows, transaction } = require('../database/connection');
const emailService = require('../services/email.service');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger.util');
const adsService = require('../services/ads.service');

// ─── Public (storefront) ────────────────────────────────────────────────────

/** GET /ads/active — sponsored products for the homepage */
const getActiveAds = asyncHandler(async (req, res) => {
  const ads = await queryRows(
    `SELECT ac.id, ac.vendor_id, ac.type, ap.product_id,
            p.name, p.slug, p.price, p.mrp, p.rating,
            (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image
     FROM ads_campaigns ac
     JOIN ad_products ap ON ac.id = ap.campaign_id
     JOIN products p ON ap.product_id = p.id
     WHERE ac.status = 'active'
       AND CURDATE() BETWEEN ac.start_date AND ac.end_date
       AND ac.spent < ac.total_budget
       AND p.status = 'active'
     ORDER BY ac.bid_amount DESC LIMIT 8`
  );
  sendSuccess(res, ads);
});

/** POST /ads/impression — public tracking (optional auth) */
const trackImpression = asyncHandler(async (req, res) => {
  const { campaignId, productId } = req.body;
  const result = await adsService.recordImpression({ campaignId, productId });
  res.json({ success: true, ...(result.reason ? { reason: result.reason } : {}) });
});

/** POST /ads/click — public tracking (optional auth) */
const trackClick = asyncHandler(async (req, res) => {
  const { campaignId, productId } = req.body;
  await adsService.recordClick({ campaignId, productId });
  res.json({ success: true });
});

// ─── Vendor: campaigns ──────────────────────────────────────────────────────

/** GET /ads/vendor — list vendor's campaigns (UI shape) */
const getVendorCampaigns = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  if (!vendor) return sendSuccess(res, { campaigns: [] });

  const rows = await queryRows(
    'SELECT * FROM ads_campaigns WHERE vendor_id = ? ORDER BY created_at DESC',
    [vendor.id]
  );
  const campaigns = await adsService.mapCampaigns(rows);
  sendSuccess(res, { campaigns });
});

/** POST /ads/vendor — create campaign (submitted for admin review) */
const createCampaign = asyncHandler(async (req, res) => {
  const vendor = await queryOne(
    'SELECT id, business_name, store_name FROM vendors WHERE user_id = ?',
    [req.user.id]
  );
  if (!vendor) return sendError(res, 'Vendor not found', 404);

  const input = adsService.normalizeCampaignInput(req.body);

  // Require the wallet to hold at least the total budget at submission.
  await adsService.ensureWallet(vendor.id);
  const wallet = await queryOne('SELECT balance FROM ads_wallets WHERE vendor_id = ?', [vendor.id]);
  if (!wallet || parseFloat(wallet.balance) < parseFloat(input.total_budget) - 1e-9) {
    return sendError(
      res,
      `Insufficient ads wallet balance. Add at least ₹${Number(input.total_budget).toLocaleString('en-IN')} to your ads wallet before launching.`,
      400
    );
  }

  const campaignId = uuidv4();
  await query(
    `INSERT INTO ads_campaigns
      (id, vendor_id, name, type, target_type, daily_budget, total_budget, bid_amount, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      campaignId, vendor.id, input.name, input.type, input.target_type,
      input.daily_budget, input.total_budget, input.bid_amount,
      input.start_date, input.end_date,
    ]
  );

  if (input.product_ids.length) {
    for (const pid of input.product_ids) {
      await query('INSERT IGNORE INTO ad_products (campaign_id, product_id) VALUES (?, ?)', [campaignId, pid]);
    }
  }

  try {
    await notificationService.createNotification(req.user.id, {
      title: 'Campaign Submitted',
      message: `Your campaign "${input.name}" has been submitted and is awaiting admin review.`,
      type: 'system',
      referenceId: campaignId,
    });
  } catch (e) { /* non-fatal */ }

  sendCreated(res, { campaignId, id: campaignId }, 'Campaign created and submitted for review');
});

/** GET /ads/vendor/alert-preferences — email alert prefs from Settings */
const getAlertPreferences = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  if (!vendor) return sendError(res, 'Vendor not found', 404);
  const prefs = await adsService.getAlertPreferences(vendor.id);
  sendSuccess(res, prefs);
});

/** PUT /ads/vendor/alert-preferences — save email alert prefs from Settings */
const updateAlertPreferences = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  if (!vendor) return sendError(res, 'Vendor not found', 404);
  const prefs = await adsService.upsertAlertPreferences(vendor.id, req.body);
  sendSuccess(res, prefs, 'Alert preferences updated');
});

/** GET /ads/vendor/summary — dashboard metrics */
const getVendorSummary = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  if (!vendor) return sendSuccess(res, { summary: {} });
  const summary = await adsService.getSummary(vendor.id);
  sendSuccess(res, { summary });
});

/** GET /ads/vendor/analytics?days=30 — daily trend for the dashboard chart */
const getVendorAnalytics = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  if (!vendor) return sendSuccess(res, { daily: [] });
  const daily = await adsService.getDailyAnalytics(vendor.id, req.query.days);
  sendSuccess(res, { daily });
});

/** GET /ads/vendor/wallet — wallet balance + transactions */
const getVendorWallet = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  if (!vendor) return sendError(res, 'Vendor not found', 404);
  const data = await adsService.getWalletWithTransactions(vendor.id);
  sendSuccess(res, data);
});

/** GET /ads/vendor/:id/analytics — per-campaign trend (UI returns .data) */
const getCampaignAnalytics = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  const rows = await queryRows(
    `SELECT date,
            COALESCE(SUM(impressions), 0) AS impressions,
            COALESCE(SUM(clicks), 0) AS clicks,
            COALESCE(SUM(conversions), 0) AS conversions,
            COALESCE(SUM(spend), 0) AS spend
     FROM ad_analytics WHERE campaign_id = ?
       AND (? IS NULL OR campaign_id IN (SELECT id FROM ads_campaigns WHERE vendor_id = ?))
     GROUP BY date ORDER BY date ASC LIMIT 30`,
    [req.params.id, vendor?.id, vendor?.id]
  );
  sendSuccess(res, rows.map((r) => ({
    ...r,
    date: r.date ? new Date(r.date).toISOString().split('T')[0] : null,
    spend: parseFloat(r.spend || 0),
  })));
});

const ensureOwnCampaign = async (vendorId, campaignId) => {
  const campaign = await queryOne(
    'SELECT * FROM ads_campaigns WHERE id = ? AND vendor_id = ?',
    [campaignId, vendorId]
  );
  return campaign;
};

/** PATCH /ads/vendor/:id/pause */
const pauseCampaign = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  const campaign = await ensureOwnCampaign(vendor?.id, req.params.id);
  if (!campaign) return sendError(res, 'Campaign not found', 404);
  if (campaign.status === 'exhausted') return sendError(res, 'Campaign budget is exhausted', 400);
  await query("UPDATE ads_campaigns SET status = 'paused' WHERE id = ?", [req.params.id]);
  sendSuccess(res, null, 'Campaign paused');
});

/** PATCH /ads/vendor/:id/resume */
const resumeCampaign = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  const campaign = await ensureOwnCampaign(vendor?.id, req.params.id);
  if (!campaign) return sendError(res, 'Campaign not found', 404);
  if (campaign.status !== 'active' && campaign.status !== 'paused') {
    return sendError(res, 'Only active or paused campaigns can be resumed', 400);
  }
  if (parseFloat(campaign.spent) >= parseFloat(campaign.total_budget)) {
    return sendError(res, 'Campaign budget is exhausted', 400);
  }
  await query("UPDATE ads_campaigns SET status = 'active' WHERE id = ?", [req.params.id]);
  sendSuccess(res, null, 'Campaign resumed');
});

/** DELETE /ads/vendor/:id */
const deleteCampaign = asyncHandler(async (req, res) => {
  const vendor = await queryOne('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
  const [result] = await query(
    'DELETE FROM ads_campaigns WHERE id = ? AND vendor_id = ?',
    [req.params.id, vendor?.id]
  );
  if (!result.affectedRows) return sendError(res, 'Campaign not found', 404);
  sendSuccess(res, null, 'Campaign deleted');
});

// ─── Admin ──────────────────────────────────────────────────────────────────

/** GET /ads/admin — all campaigns with vendor store name */
const getAllCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await queryRows(
    `SELECT ac.*, v.store_name
     FROM ads_campaigns ac JOIN vendors v ON ac.vendor_id = v.id
     ORDER BY ac.created_at DESC LIMIT 100`
  );
  const mapped = await adsService.mapCampaigns(campaigns);
  sendSuccess(res, { campaigns: mapped });
});

/** PATCH /ads/admin/:id/approve — activate campaign */
const approveCampaign = asyncHandler(async (req, res) => {
  const campaign = await queryOne('SELECT * FROM ads_campaigns WHERE id = ?', [req.params.id]);
  if (!campaign) return sendError(res, 'Campaign not found', 404);

  if (campaign.status === 'active') {
    return sendSuccess(res, null, 'Campaign already approved');
  }

  const [result] = await query(
    "UPDATE ads_campaigns SET status = 'active', rejection_reason = NULL WHERE id = ? AND status <> 'active'",
    [req.params.id]
  );
  if (!result.affectedRows) {
    return sendSuccess(res, null, 'Campaign already approved');
  }

  const vendor = await queryOne('SELECT user_id, store_name FROM vendors WHERE id = ?', [campaign.vendor_id]);
  if (vendor?.user_id) {
    try {
      await notificationService.createNotification(vendor.user_id, {
        title: 'Campaign Approved',
        message: `Your campaign "${campaign.name}" is now live.`,
        type: 'system',
        referenceId: campaign.id,
      });
      const user = await queryOne('SELECT email, name FROM users WHERE id = ?', [vendor.user_id]);
      if (user?.email) {
        await emailService.sendGenericEmail(user.email, 'Your Damini ad campaign is live', `Your campaign "${campaign.name}" has been approved and is now running.`);
      }
    } catch (e) {
      logger.error('Approve notify error:', e.message);
    }
  }
  sendSuccess(res, null, 'Campaign approved');
});

/** PATCH /ads/admin/:id/reject */
const rejectCampaign = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const campaign = await queryOne('SELECT id, name, vendor_id, status FROM ads_campaigns WHERE id = ?', [req.params.id]);
  if (!campaign) return sendError(res, 'Campaign not found', 404);

  if (campaign.status === 'rejected') {
    return sendSuccess(res, null, 'Campaign already rejected');
  }

  const [result] = await query(
    "UPDATE ads_campaigns SET status = 'rejected', rejection_reason = ? WHERE id = ? AND status <> 'rejected'",
    [reason || null, req.params.id]
  );
  if (!result.affectedRows) {
    return sendSuccess(res, null, 'Campaign already rejected');
  }

  const vendor = await queryOne('SELECT user_id FROM vendors WHERE id = ?', [campaign.vendor_id]);
  if (vendor?.user_id) {
    try {
      await notificationService.createNotification(vendor.user_id, {
        title: 'Campaign Rejected',
        message: `Your campaign "${campaign.name}" was rejected.${reason ? ` Reason: ${reason}` : ''}`,
        type: 'system',
        referenceId: campaign.id,
      });
    } catch (e) { /* non-fatal */ }
  }
  sendSuccess(res, null, 'Campaign rejected');
});

// ─── Admin: ads report ──────────────────────────────────────────────────────

/** GET /reports/ads */
const getAdsReport = asyncHandler(async (req, res) => {
  const rows = await queryRows(
    `SELECT ac.name, v.store_name, ac.impressions, ac.clicks, ac.conversions,
            ac.spent, ac.total_budget, ac.status
     FROM ads_campaigns ac JOIN vendors v ON ac.vendor_id = v.id
     ORDER BY ac.spent DESC LIMIT 100`
  );
  sendSuccess(res, rows);
});

module.exports = {
  getActiveAds,
  trackImpression,
  trackClick,
  getVendorCampaigns,
  createCampaign,
  getVendorSummary,
  getVendorAnalytics,
  getVendorWallet,
  getAlertPreferences,
  updateAlertPreferences,
  getCampaignAnalytics,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
  getAllCampaigns,
  approveCampaign,
  rejectCampaign,
  getAdsReport,
};

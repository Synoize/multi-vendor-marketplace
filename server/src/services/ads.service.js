/**
 * Damini Marketplace - Ads Service
 * Wallets, campaign helpers, analytics and budget billing for the Ads Manager.
 */

const { v4: uuidv4 } = require('uuid');
const { query, queryOne, queryRows, transaction } = require('../database/connection');
const notificationService = require('./notification.service');
const emailService = require('./email.service');
const logger = require('../utils/logger.util');

const CAMPAIGN_STATUS = ['draft', 'pending', 'active', 'paused', 'completed', 'rejected', 'exhausted'];

// Only email the low-balance alert once per vendor per 24h window.
const LOW_BALANCE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

const getOrCreateWallet = async (vendorId) => {
  await query(
    'INSERT IGNORE INTO ads_wallets (vendor_id) VALUES (?)',
    [vendorId]
  );
  const wallet = await queryOne('SELECT * FROM ads_wallets WHERE vendor_id = ?', [vendorId]);
  return wallet || { vendor_id: vendorId, balance: '0.00', lifetime_topup: '0.00', lifetime_spend: '0.00' };
};

/**
 * Credit the ads wallet inside a transaction and log the ledger entry.
 * @param {object} conn - a transaction connection (mysql2/promise pool connection)
 */
const creditWalletWithConn = async (conn, vendorId, amount, description, referenceType, referenceId) => {
  const id = uuidv4();
  await conn.execute(
    `UPDATE ads_wallets SET balance = balance + ?, lifetime_topup = lifetime_topup + ?
     WHERE vendor_id = ?`,
    [amount, amount, vendorId]
  );
  await conn.execute(
    `INSERT INTO ads_wallet_transactions (id, vendor_id, type, amount, description, reference_type, reference_id)
     VALUES (?, ?, 'credit', ?, ?, ?, ?)`,
    [id, vendorId, amount, description, referenceType, referenceId]
  );
  return id;
};

/**
 * Deduct funds from a vendor's ads wallet inside a transaction. Throws when the
 * wallet has insufficient balance.
 * @param {object} conn - a transaction connection
 */
const debitWalletWithConn = async (conn, vendorId, amount, description, referenceType, referenceId) => {
  const [res] = await conn.execute(
    `UPDATE ads_wallets SET balance = balance - ?, lifetime_spend = lifetime_spend + ?
     WHERE vendor_id = ? AND balance >= ?`,
    [amount, amount, vendorId, amount]
  );
  if (!res.affectedRows) {
    throw Object.assign(new Error('Insufficient ads wallet balance'), { statusCode: 400 });
  }
  const id = uuidv4();
  await conn.execute(
    `INSERT INTO ads_wallet_transactions (id, vendor_id, type, amount, description, reference_type, reference_id)
     VALUES (?, ?, 'debit', ?, ?, ?, ?)`,
    [id, vendorId, amount, description, referenceType, referenceId]
  );
  return id;
};

/** Public rechargable flow (used outside a shared transaction) */
const addFunds = async ({ userId, vendorId, amount, description, referenceType, referenceId }) => {
  await getOrCreateWallet(vendorId);
  return transaction(async (conn) => {
    const txId = await creditWalletWithConn(conn, vendorId, amount, description, referenceType, referenceId);
    try {
      await notificationService.createNotification(userId, {
        title: 'Ads Wallet Recharged',
        message: `₹${Number(amount).toLocaleString('en-IN')} added to your ads wallet.`,
        type: 'payment',
        referenceId: referenceId || txId,
      });
    } catch (e) { /* non-fatal */ }
    return txId;
  });
};

const getWalletWithTransactions = async (vendorId) => {
  const wallet = await getOrCreateWallet(vendorId);
  const transactions = await queryRows(
    'SELECT * FROM ads_wallet_transactions WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 100',
    [vendorId]
  );
  return {
    wallet: { balance: parseFloat(wallet.balance || 0) },
    transactions,
  };
};

// ---------------------------------------------------------------------------
// Alert preferences (Settings -> Email Alerts)
// ---------------------------------------------------------------------------

const defaultAlertPrefs = () => ({
  notifyBudgetExhausted: true,
  notifyLowBalance: true,
  lowBalanceThreshold: 200,
  maxCpcBidLimit: 5,
  lastLowBalanceAlertAt: null,
});

/**
 * Return a vendor's alert preferences, lazily seeding the row with defaults.
 */
const getAlertPreferences = async (vendorId) => {
  await query(
    'INSERT IGNORE INTO ads_alert_preferences (vendor_id) VALUES (?)',
    [vendorId]
  );
  const row = await queryOne('SELECT * FROM ads_alert_preferences WHERE vendor_id = ?', [vendorId]);
  if (!row) return defaultAlertPrefs();
  return {
    notifyBudgetExhausted: !!Number(row.notify_budget_exhausted),
    notifyLowBalance: !!Number(row.notify_low_balance),
    lowBalanceThreshold: parseFloat(row.low_balance_threshold || 0),
    maxCpcBidLimit: parseFloat(row.max_cpc_bid_limit || 0),
    lastLowBalanceAlertAt: row.last_low_balance_alert_at || null,
  };
};

/**
 * Validate + upsert a vendor's alert preferences (from the Settings page).
 */
const upsertAlertPreferences = async (vendorId, body = {}) => {
  const notifyBudgetExhausted = body.notifyBudgetExhausted === undefined ? 1 : (body.notifyBudgetExhausted ? 1 : 0);
  const notifyLowBalance = body.notifyLowBalance === undefined ? 1 : (body.notifyLowBalance ? 1 : 0);
  let lowBalanceThreshold = parseFloat(body.lowBalanceThreshold);
  if (isNaN(lowBalanceThreshold) || lowBalanceThreshold <= 0 || lowBalanceThreshold > 100000) lowBalanceThreshold = 200;
  let maxCpcBidLimit = parseFloat(body.maxCpcBidLimit);
  if (isNaN(maxCpcBidLimit) || maxCpcBidLimit <= 0 || maxCpcBidLimit > 1000) maxCpcBidLimit = 5;

  await query(
    `INSERT INTO ads_alert_preferences
       (vendor_id, notify_budget_exhausted, notify_low_balance, low_balance_threshold, max_cpc_bid_limit)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       notify_budget_exhausted = VALUES(notify_budget_exhausted),
       notify_low_balance = VALUES(notify_low_balance),
       low_balance_threshold = VALUES(low_balance_threshold),
       max_cpc_bid_limit = VALUES(max_cpc_bid_limit)`,
    [vendorId, notifyBudgetExhausted, notifyLowBalance, lowBalanceThreshold, maxCpcBidLimit]
  );
  return getAlertPreferences(vendorId);
};

// ---------------------------------------------------------------------------
// Alert triggers
// ---------------------------------------------------------------------------

/** Send the budget-exhausted email only when the vendor has opted in. */
const maybeEmailBudgetExhausted = async (vendorId, vendorUserId, campaign) => {
  try {
    const prefs = await getAlertPreferences(vendorId);
    if (!prefs.notifyBudgetExhausted) return false;
    const user = await queryOne('SELECT name, email FROM users WHERE id = ?', [vendorUserId]);
    if (!user?.email) return false;
    await emailService.sendBudgetExhaustedEmail(user.email, user.name || 'there', campaign);
    return true;
  } catch (e) {
    logger.warn(`Budget-exhausted email failed for vendor=${vendorId}: ${e.message}`);
    return false;
  }
};

/**
 * Check a vendor's ad wallet and send a low-balance alert (in-app + email)
 * honoring preferences + a 24h cooldown. Safe to call after any debit.
 */
const checkAndAlertLowBalance = async (vendorId) => {
  try {
    const wallet = await queryOne('SELECT balance FROM ads_wallets WHERE vendor_id = ?', [vendorId]);
    const balance = parseFloat(wallet?.balance || 0);
    const prefs = await getAlertPreferences(vendorId);
    if (!prefs.notifyLowBalance || balance >= prefs.lowBalanceThreshold) return false;

    const last = prefs.lastLowBalanceAlertAt ? new Date(prefs.lastLowBalanceAlertAt).getTime() : 0;
    if (Date.now() - last < LOW_BALANCE_COOLDOWN_MS) return false;

    await query('UPDATE ads_alert_preferences SET last_low_balance_alert_at = NOW() WHERE vendor_id = ?', [vendorId]);
    const vendor = await queryOne('SELECT user_id FROM vendors WHERE id = ?', [vendorId]);
    if (vendor?.user_id) {
      try {
        await notificationService.createNotification(vendor.user_id, {
          title: 'Low Ads Wallet Balance',
          message: `Your ads wallet balance is ₹${Number(balance).toLocaleString('en-IN')}, below your alert threshold of ₹${Number(prefs.lowBalanceThreshold).toLocaleString('en-IN')}.`,
          type: 'payment',
          referenceType: 'ads_wallet',
        });
      } catch (e) { /* non-fatal */ }
      const user = await queryOne('SELECT name, email FROM users WHERE id = ?', [vendor.user_id]);
      if (user?.email) {
        try {
          await emailService.sendLowWalletBalanceEmail(user.email, user.name || 'there', balance, prefs.lowBalanceThreshold);
        } catch (e) {
          logger.warn(`Low-balance email failed for vendor=${vendorId}: ${e.message}`);
        }
      }
    }
    return true;
  } catch (e) {
    logger.warn(`Low-balance alert check skipped for vendor=${vendorId}: ${e.message}`);
    return false;
  }
};

/**
 * Periodic sweep used by the scheduler: evaluate every vendor's low-balance alert.
 */
const runLowBalanceAlertSweep = async () => {
  const vendors = await queryRows('SELECT id FROM vendors');
  let alerted = 0;
  for (const v of vendors) {
    if (await checkAndAlertLowBalance(v.id)) alerted++;
  }
  return { checked: vendors.length, alerted };
};

// ---------------------------------------------------------------------------
// Campaign helpers
// ---------------------------------------------------------------------------

/**
 * Normalize + validate the campaign input coming from the UI (camelCase) or
 * other integrations (snake_case). Returns a payload ready for INSERT.
 */
const normalizeCampaignInput = (body) => {
  const pick = (camel, snake) => (body[camel] !== undefined ? body[camel] : body[snake]);

  const type = String(pick('type', 'type') || 'CPC').toLowerCase();
  const allowedTypes = ['cpc', 'cpm', 'product', 'brand'];
  if (!allowedTypes.includes(type)) {
    throw Object.assign(new Error('Invalid campaign type'), { statusCode: 400 });
  }

  const name = String(pick('name', 'name') || '').trim();
  if (name.length < 3) {
    throw Object.assign(new Error('Campaign name must be at least 3 characters'), { statusCode: 400 });
  }

  const dailyBudget = parseFloat(pick('dailyBudget', 'daily_budget'));
  const totalBudget = parseFloat(pick('totalBudget', 'total_budget'));
  const bidAmount = parseFloat(pick('bidAmount', 'bid_amount')) || (type === 'cpm' ? 10 : 1);

  if (!dailyBudget || dailyBudget < 1) {
    throw Object.assign(new Error('Daily budget is required and must be at least ₹1'), { statusCode: 400 });
  }
  if (!totalBudget || totalBudget < dailyBudget) {
    throw Object.assign(new Error('Total budget must be at least the daily budget'), { statusCode: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  const startDate = String(pick('startDate', 'start_date') || today);
  const endDate = String(pick('endDate', 'end_date') || '');
  if (endDate && endDate < startDate) {
    throw Object.assign(new Error('End date must be after start date'), { statusCode: 400 });
  }

  const productIds = Array.isArray(pick('products', 'productIds'))
    ? pick('products', 'productIds')
    : Array.isArray(body.product_ids) ? body.product_ids : [];

  return {
    name,
    type,
    target_type: String(pick('targetType', 'target_type') || 'product'),
    daily_budget: dailyBudget,
    total_budget: totalBudget,
    bid_amount: bidAmount,
    start_date: startDate,
    end_date: endDate || null,
    product_ids: productIds.map(String).filter(Boolean),
  };
};

/** Map a DB row (snake_case) to the UI shape (camelCase + _id + products). */
const formatCampaign = (row, products = []) => ({
  _id: row.id,
  id: row.id,
  name: row.name,
  store_name: row.store_name,
  type: row.type === 'cpm' ? 'CPM' : row.type === 'cpc' ? 'CPC' : row.type,
  targetType: row.target_type,
  dailyBudget: parseFloat(row.daily_budget),
  totalBudget: parseFloat(row.total_budget),
  totalSpend: parseFloat(row.spent || 0),
  spent: parseFloat(row.spent || 0),
  total_budget: parseFloat(row.total_budget),
  daily_budget: parseFloat(row.daily_budget),
  bidAmount: parseFloat(row.bid_amount),
  bid_amount: parseFloat(row.bid_amount),
  startDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : null,
  endDate: row.end_date ? new Date(row.end_date).toISOString().split('T')[0] : null,
  start_date: row.start_date,
  end_date: row.end_date,
  status: row.status,
  rejectionReason: row.rejection_reason,
  impressions: Number(row.impressions || 0),
  clicks: Number(row.clicks || 0),
  conversions: Number(row.conversions || 0),
  products: products.map((p) => ({
    _id: p.product_id,
    id: p.product_id,
    name: p.name,
    slug: p.slug,
    price: p.price ? parseFloat(p.price) : null,
    mrp: p.mrp ? parseFloat(p.mrp) : null,
    image: p.image,
  })),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Batch-load products + primary images for many campaigns and map them all.
 * Avoids the N+1 (one query per campaign) that made list endpoints slow.
 */
const mapCampaigns = async (rows) => {
  if (!rows || rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const idPlaceholders = ids.map(() => '?').join(',');

  const productRows = await queryRows(
    `SELECT ap.campaign_id, ap.product_id, p.name, p.slug, p.price, p.mrp
     FROM ad_products ap
     LEFT JOIN products p ON p.id = ap.product_id
     WHERE ap.campaign_id IN (${idPlaceholders})`,
    ids
  );

  const productIds = [...new Set(productRows.map((r) => r.product_id).filter(Boolean))];
  const imageByProduct = new Map();
  if (productIds.length) {
    const imgPlaceholders = productIds.map(() => '?').join(',');
    const images = await queryRows(
      `SELECT product_id, url FROM product_images
       WHERE is_primary = 1 AND product_id IN (${imgPlaceholders})`,
      productIds
    );
    for (const img of images) {
      if (!imageByProduct.has(img.product_id)) imageByProduct.set(img.product_id, img.url);
    }
  }

  const productsByCampaign = new Map();
  for (const p of productRows) {
    if (!productsByCampaign.has(p.campaign_id)) productsByCampaign.set(p.campaign_id, []);
    productsByCampaign.get(p.campaign_id).push({
      product_id: p.product_id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      mrp: p.mrp,
      image: imageByProduct.get(p.product_id) || null,
    });
  }

  return rows.map((row) => formatCampaign(row, productsByCampaign.get(row.id) || []));
};

/** Map a single campaign row (used by single-object flows). */
const mapCampaign = async (row) => {
  if (!row) return null;
  const mapped = await mapCampaigns([row]);
  return mapped[0] || null;
};

// ---------------------------------------------------------------------------
// Summary + analytics
// ---------------------------------------------------------------------------

const getSummary = async (vendorId) => {
  const row = await queryOne(
    `SELECT
       COALESCE(SUM(spent), 0) AS totalSpend,
       COALESCE(SUM(impressions), 0) AS totalImpressions,
       COALESCE(SUM(clicks), 0) AS totalClicks,
       COALESCE(SUM(conversions), 0) AS totalConversions,
       COALESCE(SUM(CASE WHEN status IN ('active','paused') THEN 1 ELSE 0 END), 0) AS activeCampaigns,
       COUNT(*) AS totalCampaigns
     FROM ads_campaigns WHERE vendor_id = ?`,
    [vendorId]
  );

  // ROAS: total attributed revenue vs spend. We estimate attributed revenue as
  // conversions-derived. If there is no conversion tracking yet, derive revenue
  // from delivered order items whose products are part of any campaign and
  // attributed in the reporting window (best-effort for the dashboard).
  const revenueRow = await queryOne(
    `SELECT COALESCE(SUM(oi.total_price), 0) AS revenue
     FROM order_items oi
     JOIN ad_products ap ON ap.product_id = oi.product_id
     WHERE oi.vendor_id = ? AND oi.status = 'delivered'`,
    [vendorId]
  );

  const totalSpend = parseFloat(row?.totalSpend || 0);
  const totalRevenue = parseFloat(revenueRow?.revenue || 0);
  const totalClicks = Number(row?.totalClicks || 0);
  const totalImpressions = Number(row?.totalImpressions || 0);

  const summary = {
    totalSpend,
    totalImpressions,
    totalClicks,
    totalConversions: Number(row?.totalConversions || 0),
    activeCampaigns: Number(row?.activeCampaigns || 0),
    totalCampaigns: Number(row?.totalCampaigns || 0),
    revenue: totalRevenue,
    roas: totalSpend > 0 ? parseFloat((totalRevenue / totalSpend).toFixed(2)) : 0,
    ctr: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
    spendChange: null,
    impressionsChange: null,
    clicksChange: null,
    ctrChange: null,
    roasChange: null,
  };

  return summary;
};

const getDailyAnalytics = async (vendorId, days = 30) => {
  const limit = Math.min(365, Math.max(1, parseInt(days) || 30));
  const rows = await queryRows(
    `SELECT a.date,
            COALESCE(SUM(a.impressions), 0) AS impressions,
            COALESCE(SUM(a.clicks), 0) AS clicks,
            COALESCE(SUM(a.conversions), 0) AS conversions,
            COALESCE(SUM(a.spend), 0) AS spend
     FROM ad_analytics a
     JOIN ads_campaigns ac ON ac.id = a.campaign_id
     WHERE ac.vendor_id = ? AND a.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY a.date ORDER BY a.date ASC`,
    [vendorId, limit]
  );
  return rows.map((r) => ({
    date: r.date ? new Date(r.date).toISOString().split('T')[0] : null,
    impressions: Number(r.impressions || 0),
    clicks: Number(r.clicks || 0),
    conversions: Number(r.conversions || 0),
    spend: parseFloat(r.spend || 0),
  }));
};

// ---------------------------------------------------------------------------
// Tracking + billing
// ---------------------------------------------------------------------------

const todayStr = () => new Date().toISOString().split('T')[0];

const isCampaignServing = (campaign) =>
  campaign && campaign.status === 'active' &&
  (!campaign.start_date || todayStr() >= new Date(campaign.start_date).toISOString().split('T')[0]) &&
  (!campaign.end_date || todayStr() <= new Date(campaign.end_date).toISOString().split('T')[0]);

/**
 * Resolve a concrete product id for analytics rows. Ad_analytics has a unique
 * key on (campaign_id, product_id, date) and NULLs defeat that dedup, so we
 * always target a real product id (falling back to the campaign's first
 * promoted product when none is supplied).
 */
const resolveProductId = async (campaign, productId) => {
  if (productId) return String(productId);
  const row = await queryOne(
    'SELECT product_id FROM ad_products WHERE campaign_id = ? LIMIT 1',
    [campaign.id]
  );
  return row ? row.product_id : null;
};

/**
 * Auto-pause the campaign + notify the vendor when its total budget is hit.
 */
const checkAndMaybeExhaust = async (campaignId, vendorId) => {
  const camp = await queryOne(
    'SELECT name, spent, total_budget FROM ads_campaigns WHERE id = ?',
    [campaignId]
  );
  if (camp && parseFloat(camp.spent) >= parseFloat(camp.total_budget) && camp.total_budget > 0) {
    await query("UPDATE ads_campaigns SET status = 'exhausted' WHERE id = ?", [campaignId]);
    const vendor = await queryOne('SELECT user_id FROM vendors WHERE id = ?', [vendorId]);
    if (vendor?.user_id) {
      try {
        await notificationService.createNotification(vendor.user_id, {
          title: 'Campaign Budget Exhausted',
          message: `Your campaign has reached its total budget and been paused.`,
          type: 'system',
          referenceId: campaignId,
        });
      } catch (e) { /* non-fatal */ }
      await maybeEmailBudgetExhausted(vendorId, vendor.user_id, camp);
    }
  }
};

/**
 * Reconcile a campaign's derived spend against its wallet and deduct the
 * incremental delta. Used for CPC (per click) and CPM (per 1000 impressions)
 * billing. Applies the debit to the product-specific analytics row so unique
 * key dedup keeps a single row per campaign/product/day.
 */
const reconcileSpend = async (conn, campaign, billAmount, productId) => {
  if (!billAmount || billAmount <= 0) return;
  // Debit wallet (throws if insufficient balance)
  await debitWalletWithConn(
    conn,
    campaign.vendor_id,
    billAmount,
    `Campaign spend: ${campaign.name}`,
    'campaign_spend',
    campaign.id
  );
  await conn.execute(
    'UPDATE ads_campaigns SET spent = spent + ? WHERE id = ?',
    [billAmount, campaign.id]
  );
  const today = todayStr();
  await conn.execute(
    `INSERT INTO ad_analytics (campaign_id, product_id, date, spend)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE spend = spend + ?`,
    [campaign.id, productId || null, today, billAmount, billAmount]
  );
};

/**
 * Record an impression and, for CPM campaigns, bill the wallet per 1000.
 */
const recordImpression = async ({ campaignId, productId }) => {
  const campaign = await queryOne('SELECT * FROM ads_campaigns WHERE id = ?', [campaignId]);
  if (!isCampaignServing(campaign)) return { success: false, reason: 'not_serving' };

  const today = todayStr();
  const pid = await resolveProductId(campaign, productId);
  await query(
    'UPDATE ads_campaigns SET impressions = impressions + 1 WHERE id = ?',
    [campaignId]
  );
  await query(
    `INSERT INTO ad_analytics (campaign_id, product_id, date, impressions)
     VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE impressions = impressions + 1`,
    [campaignId, pid, today]
  );

  if (String(campaign.type) === 'cpm') {
    const updated = await queryOne(
      'SELECT impressions, spent FROM ads_campaigns WHERE id = ?',
      [campaignId]
    );
    const targetSpend = Math.floor(Number(updated.impressions) / 1000) * parseFloat(campaign.bid_amount);
    const delta = parseFloat((targetSpend - parseFloat(updated.spent)).toFixed(2));
    if (delta > 0) {
      try {
        await transaction(async (conn) => {
          await reconcileSpend(conn, campaign, delta, pid);
        });
        await checkAndMaybeExhaust(campaignId, campaign.vendor_id);
        await checkAndAlertLowBalance(campaign.vendor_id);
      } catch (err) {
        // Out of wallet funds — pause the campaign
        await query("UPDATE ads_campaigns SET status = 'paused' WHERE id = ?", [campaignId]);
        const vendor = await queryOne('SELECT user_id FROM vendors WHERE id = ?', [campaign.vendor_id]);
        if (vendor?.user_id) {
          try {
            await notificationService.createNotification(vendor.user_id, {
              title: 'Ads Wallet Empty',
              message: `Your campaign "${campaign.name}" was paused due to insufficient ads wallet balance.`,
              type: 'system',
              referenceId: campaignId,
            });
          } catch (e) { /* non-fatal */ }
        }
        await checkAndAlertLowBalance(campaign.vendor_id);
      }
    }
  }
  return { success: true };
};

/**
 * Record a click and, for CPC campaigns, bill the wallet per click.
 */
const recordClick = async ({ campaignId, productId }) => {
  const campaign = await queryOne('SELECT * FROM ads_campaigns WHERE id = ?', [campaignId]);
  if (!isCampaignServing(campaign)) return { success: false, reason: 'not_serving' };

  const today = todayStr();
  const pid = await resolveProductId(campaign, productId);
  await query(
    'UPDATE ads_campaigns SET clicks = clicks + 1 WHERE id = ?',
    [campaignId]
  );
  await query(
    `INSERT INTO ad_analytics (campaign_id, product_id, date, clicks)
     VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE clicks = clicks + 1`,
    [campaignId, pid, today]
  );

  let billAmount = 0;
  if (String(campaign.type) === 'cpc') {
    billAmount = parseFloat(campaign.bid_amount || 0);
  }

  if (billAmount > 0) {
    try {
      await transaction(async (conn) => {
        await reconcileSpend(conn, campaign, billAmount, pid);
      });
      await checkAndMaybeExhaust(campaignId, campaign.vendor_id);
      await checkAndAlertLowBalance(campaign.vendor_id);
    } catch (err) {
      await query("UPDATE ads_campaigns SET status = 'paused' WHERE id = ?", [campaignId]);
      const vendor = await queryOne('SELECT user_id FROM vendors WHERE id = ?', [campaign.vendor_id]);
      if (vendor?.user_id) {
        try {
          await notificationService.createNotification(vendor.user_id, {
            title: 'Ads Wallet Empty',
            message: `Your campaign "${campaign.name}" was paused due to insufficient ads wallet balance.`,
            type: 'system',
            referenceId: campaignId,
          });
        } catch (e) { /* non-fatal */ }
      }
      await checkAndAlertLowBalance(campaign.vendor_id);
    }
  }
  return { success: true };
};

/**
 * Ensure a wallet has been created for a vendor (safe to call on any vendor op).
 */
const ensureWallet = getOrCreateWallet;

module.exports = {
  CAMPAIGN_STATUS,
  getOrCreateWallet,
  addFunds,
  creditWalletWithConn,
  debitWalletWithConn,
  getWalletWithTransactions,
  getAlertPreferences,
  upsertAlertPreferences,
  checkAndAlertLowBalance,
  runLowBalanceAlertSweep,
  normalizeCampaignInput,
  mapCampaign,
  mapCampaigns,
  getSummary,
  getDailyAnalytics,
  recordImpression,
  recordClick,
  ensureWallet,
};

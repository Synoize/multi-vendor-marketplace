/**
 * Damini Marketplace - Vendor Payout / Settlement Service
 *
 * Handles vendor payout eligibility and the automated weekly settlement cycle.
 * An order item becomes payable once it is delivered AND its return window has
 * elapsed AND it has no active return / refund. Payouts are created per vendor
 * when the accumulated payable amount meets the configured minimum (`min_payout`).
 */

const { query, queryRows, queryOne } = require('../database/connection');
const logger = require('../utils/logger.util');
const emailService = require('./email.service');
const notificationService = require('./notification.service');

// Return statuses that are still open / pending resolution (not yet payable).
const RETURN_OPEN = "'requested','under_review','approved','pickup_scheduled','picked_up','quality_check'";

/**
 * Returns the vendor PENDING (unsettled) amount and list of eligible order items.
 * An item is excluded if its order_id has already been settled in a payout, or if
 * it has an active return, or if it has not yet been delivered.
 *
 * @param {string|null} vendorId - restrict to a single vendor (for the vendor panel)
 * @param {boolean} [includeMinPayout] - also compute and return the configured min_payout
 */
async function getEligibleOrders(vendorId = null, includeMinPayout = false) {
  const conditions = [];
  const params = [];

  conditions.push(`oi.status = 'delivered'`);
  // Return window must have elapsed since the order was delivered.
  conditions.push(`(COALESCE(o.delivered_at, o.updated_at) + INTERVAL oi.return_window DAY) <= NOW()`);
  // Order must not have already been settled in a payout.
  conditions.push(
    `NOT EXISTS (
       SELECT 1 FROM vendor_payouts vp
       WHERE JSON_SEARCH(vp.order_ids, 'one', oi.order_id) IS NOT NULL
     )`
  );
  // No active return for this item.
  conditions.push(
    `NOT EXISTS (
       SELECT 1 FROM returns r
       WHERE r.order_item_id = oi.id AND r.status IN (${RETURN_OPEN})
     )`
  );

  if (vendorId) {
    conditions.push(`oi.vendor_id = ?`);
    params.push(vendorId);
  }

  const where = conditions.join(' AND ');

  const rows = await queryRows(
    `SELECT oi.id AS order_item_id,
            oi.order_id,
            oi.vendor_id,
            oi.product_name,
            oi.vendor_payout
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE ${where}
     ORDER BY oi.created_at ASC`,
    params
  );

  // Group by vendor and sum. Also exclude items with an existing approved return
  // is handled above by excluding active returns; a fully settled (approved) return
  // keeps the item excluded because it is no longer 'delivered'.
  const byVendor = new Map();
  for (const row of rows) {
    const vid = row.vendor_id;
    if (!byVendor.has(vid)) byVendor.set(vid, { vendor_id: vid, orderIds: new Set(), payable: 0, itemCount: 0 });
    const entry = byVendor.get(vid);
    entry.orderIds.add(row.order_id);
    entry.payable = Math.round((entry.payable + parseFloat(row.vendor_payout)) * 100) / 100;
    entry.itemCount += 1;
  }

  const result = {
    raw: rows,
    byVendor: Array.from(byVendor.values()).map((e) => ({
      vendor_id: e.vendor_id,
      orderIds: Array.from(e.orderIds),
      payable: e.payable,
      itemCount: e.itemCount,
    })),
  };
  if (includeMinPayout) {
    result.minPayout = await getMinPayout();
  }
  return result;
}

/**
 * Get the configured minimum payout threshold.
 */
async function getMinPayout() {
  const row = await queryOne("SELECT `value` FROM platform_settings WHERE `key` = 'min_payout'");
  const val = row && row.value ? parseFloat(row.value) : NaN;
  return Number.isFinite(val) && val >= 0 ? val : 0;
}

/**
 * Compute the pending (unsettled) payout amount for a vendor.
 * Used by the vendor payout panel and dashboards.
 */
async function getVendorPendingAmount(vendorId) {
  const { byVendor } = await getEligibleOrders(vendorId);
  const entry = byVendor.find((e) => e.vendor_id === vendorId);
  return entry ? entry.payable : 0;
}

/**
 * Preview the next settlement cycle WITHOUT creating any payouts.
 * Returns per-vendor eligible details: payable amount, order count, whether it
 * will be released, and reason if skipped (below min / missing bank details).
 */
async function previewSettlementCycle() {
  const { byVendor } = await getEligibleOrders();
  const minPayout = await getMinPayout();
  const details = [];

  for (const entry of byVendor) {
    const vendor = await queryOne(
      `SELECT v.id, v.store_name, v.bank_name, v.ifsc_code, v.account_number,
              u.name AS owner_name, u.email
       FROM vendors v JOIN users u ON v.user_id = u.id
       WHERE v.id = ?`,
      [entry.vendor_id]
    );
    if (!vendor) continue;

    const hasBank = !!(vendor.bank_name && vendor.account_number && vendor.ifsc_code);
    const belowMin = entry.payable < minPayout;
    const willRelease = hasBank && !belowMin;

    details.push({
      vendor_id: entry.vendor_id,
      store_name: vendor.store_name,
      owner_name: vendor.owner_name,
      email: vendor.email,
      payable: entry.payable,
      order_count: entry.orderIds.length,
      min_payout: minPayout,
      has_bank: hasBank,
      below_min: belowMin,
      will_release: willRelease,
    });
  }

  // Sort so the ones that will be released appear first.
  details.sort((a, b) => Number(b.will_release) - Number(a.will_release) || b.payable - a.payable);

  return {
    min_payout: minPayout,
    count: details.length,
    will_release_count: details.filter((d) => d.will_release).length,
    will_release_total: details
      .filter((d) => d.will_release)
      .reduce((s, d) => s + d.payable, 0),
    vendors: details,
  };
}

/**
 * Run one settlement cycle.
 *
 * For every vendor with eligible payable amount >= min_payout, create a
 * `vendor_payouts` record (status completed) recording the settled order IDs,
 * then notify and email the vendor.
 *
 * Returns a summary of created payouts.
 */
async function runSettlementCycle() {
  const { byVendor } = await getEligibleOrders();
  if (!byVendor.length) return { created: 0, skippedUnderMin: 0, payouts: [] };

  const minPayout = await getMinPayout();
  const created = [];
  let skippedUnderMin = 0;
  let skippedNoBank = 0;

  for (const entry of byVendor) {
    if (entry.payable < minPayout) {
      skippedUnderMin++;
      continue;
    }

    // Skip vendors without settlement bank details.
    const vendor = await queryOne(
      `SELECT v.id, v.store_name, v.bank_name, v.ifsc_code, v.account_number, v.account_holder,
              u.id AS user_id, u.name AS owner_name, u.email
       FROM vendors v JOIN users u ON v.user_id = u.id
       WHERE v.id = ?`,
      [entry.vendor_id]
    );
    if (!vendor) continue;
    if (!vendor.bank_name || !vendor.account_number || !vendor.ifsc_code) {
      skippedNoBank++;
      continue;
    }

    const ref = `STL-${Date.now()}-${entry.vendor_id.slice(0, 8).toUpperCase()}`;
    await query(
      `INSERT INTO vendor_payouts
         (vendor_id, amount, order_ids, status, transaction_ref, initiated_at, completed_at)
       VALUES (?, ?, ?, 'completed', ?, NOW(), NOW())`,
      [entry.vendor_id, entry.payable, JSON.stringify(entry.orderIds), ref]
    );

    try {
      await notificationService.createNotification(vendor.user_id, {
        title: 'Payout Released',
        message: `Your payout of ₹${entry.payable.toFixed(2)} has been released to your registered bank account. It will reflect within 1-2 business days.`,
        type: 'payment',
        referenceId: null,
        referenceType: 'payout',
      });
    } catch (e) {
      logger.warn(`[Payout] Notification failed for ${vendor.user_id}: ${e.message}`);
    }

    if (vendor.email) {
      emailService.sendPayoutReleasedEmail(vendor.email, vendor.owner_name || 'Seller', entry.payable).catch(() => {});
    }

    logger.info(`[Payout] Released ₹${entry.payable} to vendor ${entry.vendor_id} (${vendor.store_name})`);
    created.push({ vendor_id: entry.vendor_id, store_name: vendor.store_name, amount: entry.payable });
  }

  return { created: created.length, skippedUnderMin, skippedNoBank, payouts: created };
}

/**
 * Settle a SINGLE vendor one-by-one.
 * Settles only when there's eligible balance at/above the min threshold and the
 * vendor has bank details. Throws a descriptive error otherwise.
 *
 * @param {string} vendorId
 * @returns {Promise<{vendor: Object, amount: number, orderCount: number}>}
 */
async function settleVendor(vendorId) {
  const { byVendor } = await getEligibleOrders(vendorId);
  const entry = byVendor.find((e) => e.vendor_id === vendorId);

  if (!entry || entry.payable <= 0) {
    throw Object.assign(new Error('No eligible (delivered, return-window-elapsed) balance for this vendor'), { statusCode: 400 });
  }

  const minPayout = await getMinPayout();
  if (entry.payable < minPayout) {
    throw Object.assign(
      new Error(`Eligible balance ₹${entry.payable.toFixed(2)} is below the minimum payout of ₹${minPayout.toFixed(2)}`),
      { statusCode: 400 }
    );
  }

  const vendor = await queryOne(
    `SELECT v.id, v.store_name, v.bank_name, v.ifsc_code, v.account_number, v.account_holder,
            u.id AS user_id, u.name AS owner_name, u.email
     FROM vendors v JOIN users u ON v.user_id = u.id
     WHERE v.id = ?`,
    [vendorId]
  );
  if (!vendor) throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });
  if (!vendor.bank_name || !vendor.account_number || !vendor.ifsc_code) {
    throw Object.assign(new Error('Vendor has no settlement bank details on file'), { statusCode: 400 });
  }

  const ref = `STL-${Date.now()}-${vendorId.slice(0, 8).toUpperCase()}`;
  await query(
    `INSERT INTO vendor_payouts
       (vendor_id, amount, order_ids, status, transaction_ref, initiated_at, completed_at)
     VALUES (?, ?, ?, 'completed', ?, NOW(), NOW())`,
    [vendorId, entry.payable, JSON.stringify(entry.orderIds), ref]
  );

  try {
    await notificationService.createNotification(vendor.user_id, {
      title: 'Payout Released',
      message: `Your payout of ₹${entry.payable.toFixed(2)} has been released to your registered bank account. It will reflect within 1-2 business days.`,
      type: 'payment',
      referenceId: null,
      referenceType: 'payout',
    });
  } catch (e) {
    logger.warn(`[Payout] Notification failed for ${vendor.user_id}: ${e.message}`);
  }

  if (vendor.email) {
    emailService.sendPayoutReleasedEmail(vendor.email, vendor.owner_name || 'Seller', entry.payable).catch(() => {});
  }

  logger.info(`[Payout] Released ₹${entry.payable} to vendor ${vendorId} (${vendor.store_name}) [single]`);
  return { vendor: vendorId, store_name: vendor.store_name, amount: entry.payable, orderCount: entry.orderIds.length };
}

module.exports = {
  getEligibleOrders,
  getMinPayout,
  getVendorPendingAmount,
  previewSettlementCycle,
  runSettlementCycle,
  settleVendor,
};

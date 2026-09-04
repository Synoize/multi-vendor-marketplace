/**
 * Damini Marketplace - Shipment Service (Shiprocket Integration)
 * Handles all Shiprocket API calls with in-memory token caching.
 */

'use strict';

const axios = require('axios');
const config = require('config');
const { queryRows, queryOne, transaction } = require('../database/connection');
const logger = require('../utils/logger.util');

// ─── Shiprocket config ────────────────────────────────────────────────────────
// Credentials may be overridden via environment variables so they are never
// exposed to the frontend or committed to source control.
const SR_BASE = process.env.SHIPROCKET_BASE_URL || config.get('shiprocket.baseUrl');
const SR_EMAIL = process.env.SHIPROCKET_EMAIL || config.get('shiprocket.email');
const SR_PASSWORD = process.env.SHIPROCKET_PASSWORD || config.get('shiprocket.password');
const SR_CHANNEL_ID = process.env.SHIPROCKET_CHANNEL_ID || config.get('shiprocket.channelId');

// Master on/off switch for auto pickup-location management. Defaults to ON.
const _pickupEnabledConfig = config.has('shiprocket.pickupEnabled') ? config.get('shiprocket.pickupEnabled') : true;
const SR_PICKUP_ENABLED = String(process.env.SHIPROCKET_PICKUP_ENABLED ?? _pickupEnabledConfig).toLowerCase() !== 'false';

const crypto = require('crypto');

// ─── In-memory token cache ────────────────────────────────────────────────────
let _tokenCache = {
  token: null,
  expiresAt: 0, // Unix ms
};

/**
 * Build an authenticated Axios instance for Shiprocket.
 * Re-authenticates if token is expired or missing.
 * @returns {Promise<AxiosInstance>}
 */
async function _getClient() {
  const token = await authenticate();
  return axios.create({
    baseURL: SR_BASE,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. authenticate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticate with Shiprocket API and cache the token.
 * Token is valid for ~10 days; we refresh 10 minutes before expiry.
 * @returns {Promise<string>} JWT token
 */
async function authenticate() {
  const now = Date.now();
  // Return cached token if still valid (with 10-min buffer)
  if (_tokenCache.token && _tokenCache.expiresAt > now + 10 * 60 * 1000) {
    return _tokenCache.token;
  }

  logger.info('[ShipmentService] Authenticating with Shiprocket...');
  const response = await axios.post(`${SR_BASE}/auth/login`, {
    email: SR_EMAIL,
    password: SR_PASSWORD,
  });

  const { token, created_at } = response.data;

  // Shiprocket tokens expire after 10 days
  _tokenCache = {
    token,
    expiresAt: new Date(created_at).getTime() + 10 * 24 * 60 * 60 * 1000,
  };

  logger.info('[ShipmentService] Shiprocket token cached successfully.');
  return token;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1b. Pickup-location management (auto, idempotent, retry-safe)
// ─────────────────────────────────────────────────────────────────────────────

const PICKUP_STATUS = {
  NOT_CONFIGURED: 'not_configured',
  PENDING: 'pending',
  REGISTERED: 'registered',
  FAILED: 'failed',
};

/**
 * Deterministic short hash of a vendor id, used to build compact Shiprocket
 * pickup codes. Kept short because Shiprocket's addpickup `pickup_location`
 * and create-order `pickup_location` fields are limited to 36 characters.
 * @param {string} vendorId - Internal vendor UUID
 * @param {number} length   - number of hex chars to keep (default 12)
 * @returns {string}
 */
function vendorIdHash(vendorId, length = 12) {
  return crypto.createHash('sha256').update(String(vendorId)).digest('hex').slice(0, length);
}

/**
 * Generate a unique, Shiprocket-compatible pickup location code for a vendor.
 * Shiprocket codes allow letters, digits and underscores only and must be at
 * most 36 characters. `VENDOR_` (7) + 12-char hash = 19 chars, well under the
 * limit, stable for the same vendor (enables idempotent retry) and practically
 * unique across vendors.
 * @param {string} vendorId - Internal vendor UUID
 * @returns {string} e.g. VENDOR_3f9c8b2eaaaa
 */
function generatePickupCode(vendorId) {
  return `VENDOR_${vendorIdHash(vendorId)}`;
}

/**
 * Build a stable hash of a vendor's pickup address so we can detect, without
 * an API round-trip, whether the registered address has changed. Used to keep
 * registration idempotent and to avoid silently creating duplicates.
 * @param {Object} vendor - vendors row
 * @returns {string} hex-encoded SHA-256, or '' when address is incomplete
 */
function pickupAddressHash(vendor) {
  const parts = [
    vendor.pickup_name, vendor.pickup_phone,
    vendor.pickup_line1, vendor.pickup_line2,
    vendor.pickup_city, vendor.pickup_state, vendor.pickup_pincode,
  ].map((p) => String(p || '').trim().toLowerCase());
  if (!parts[0] || !parts[2] || !parts[4] || !parts[5] || !parts[6]) {
    return '';
  }
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Validate that a vendor has a complete, usable pickup address.
 * @returns {Object} { valid: boolean, reason?: string }
 */
function validatePickupAddress(vendor) {
  if (!vendor.pickup_line1 || !String(vendor.pickup_line1).trim()) {
    return { valid: false, reason: 'Pickup address (line 1) is missing' };
  }
  if (!vendor.pickup_city || !String(vendor.pickup_city).trim()) {
    return { valid: false, reason: 'Pickup city is missing' };
  }
  if (!vendor.pickup_state || !String(vendor.pickup_state).trim()) {
    return { valid: false, reason: 'Pickup state is missing' };
  }
  if (!vendor.pickup_pincode || !String(vendor.pickup_pincode).trim()) {
    return { valid: false, reason: 'Pickup pincode is missing' };
  }
  if (!vendor.pickup_name || !String(vendor.pickup_name).trim()) {
    return { valid: false, reason: 'Pickup contact name is missing' };
  }
  if (!vendor.pickup_phone || !String(vendor.pickup_phone).trim()) {
    return { valid: false, reason: 'Pickup contact phone is missing' };
  }
  return { valid: true };
}

/**
 * Does this vendor already have a successfully registered pickup location?
 * @param {Object} vendor - vendors row
 * @returns {boolean}
 */
function hasRegisteredPickup(vendor) {
  return vendor && vendor.shiprocket_pickup_status === PICKUP_STATUS.REGISTERED
    && !!vendor.shiprocket_pickup_location;
}

/**
 * Persist the Shiprocket pickup-registration outcome onto a vendor row.
 * @param {string} vendorId
 * @param {Object} fields  - subset of columns to update (status/error/id/code/...)
 */
async function _savePickupState(vendorId, fields) {
  const set = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  const params = Object.values(fields);
  await queryRows(`UPDATE vendors SET ${set}, updated_at = NOW() WHERE id = ?`, [...params, vendorId]);
}

/**
 * Compute the current pickup registration state for a vendor and return a
 * short, human-friendly status plus the machine status.
 * @param {Object|string} vendorOrId - vendors row or vendor id
 */
async function getVendorPickupStatus(vendorOrId) {
  let vendor = vendorOrId;
  if (typeof vendorOrId === 'string') {
    vendor = await queryOne('SELECT * FROM vendors WHERE id = ?', [vendorOrId]);
  }
  if (!vendor) throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });

  const map = {
    [PICKUP_STATUS.NOT_CONFIGURED]: 'Pickup Not Configured',
    [PICKUP_STATUS.PENDING]: 'Pickup Registration Pending',
    [PICKUP_STATUS.REGISTERED]: 'Pickup Registered',
    [PICKUP_STATUS.FAILED]: 'Pickup Registration Failed',
  };
  return {
    status: vendor.shiprocket_pickup_status,
    label: map[vendor.shiprocket_pickup_status] || 'Pickup Not Configured',
    pickupLocation: vendor.shiprocket_pickup_location || null,
    pickupCode: vendor.shiprocket_pickup_code || null,
    pickupId: vendor.shiprocket_pickup_id || null,
    verified: typeof vendor.shiprocket_pickup_verified === 'number'
      ? !!vendor.shiprocket_pickup_verified
      : null,
    error: vendor.shiprocket_pickup_error || null,
  };
}

/**
 * Extract phone-OTP verification (1/0/null) from a Shiprocket pickup record.
 * Unverified pickups block order dispatch, so we track this per vendor.
 * @param {Object|null} pickup - pickup item from the Shiprocket list endpoint
 * @returns {number|null} 1 = verified, 0 = unverified, null = unknown
 */
function pickupVerified(pickup) {
  if (!pickup || typeof pickup.phone_verified === 'undefined') return null;
  const v = pickup.phone_verified === true || pickup.phone_verified === 1;
  return v ? 1 : 0;
}

/**
 * Refresh a vendor's stored phone-OTP verification status from Shiprocket's
 * live pickup list. The pickup itself must be OTP-verified on Shiprocket before
 * any order can be dispatched from it; tracking this lets us give a clear,
 * actionable error instead of Shiprocket's raw failure.
 * @param {string} vendorId - Internal vendor UUID
 * @returns {Promise<number|null>} 1 verified / 0 unverified / null unknown
 */
async function refreshVendorPickupVerification(vendorId) {
  const vendor = await queryOne('SELECT * FROM vendors WHERE id = ?', [vendorId]);
  if (!vendor || !vendor.shiprocket_pickup_code) return null;
  try {
    const client = await _getClient();
    const listRes = await client.get('/settings/company/pickup');
    const listData = listRes.data;
    const items = Array.isArray(listData?.data?.shipping_address)
      ? listData.data.shipping_address
      : Array.isArray(listData?.shipping_address)
        ? listData.shipping_address
        : Array.isArray(listData?.data)
          ? listData.data
          : [];
    const found = items.find(
      (p) => String(p.pickup_location || p.pickup_code || '') === String(vendor.shiprocket_pickup_code)
    ) || items.find((p) => String(p.id) === String(vendor.shiprocket_pickup_id));
    if (!found) {
      logger.warn(`[Pickup] Pickup ${vendor.shiprocket_pickup_code} not found on Shiprocket to refresh verification (vendor=${vendorId})`);
      return null;
    }
    const verified = pickupVerified(found);
    if (typeof verified === 'number') {
      await _savePickupState(vendorId, { shiprocket_pickup_verified: verified });
    }
    logger.info(`[Pickup] Verification refreshed for vendor=${vendorId}: ${verified === 1 ? 'verified' : verified === 0 ? 'unverified' : 'unknown'}`);
    return verified;
  } catch (err) {
    logger.warn(`[Pickup] Could not refresh verification for vendor=${vendorId}: ${err.message}`);
    return null;
  }
}

/**
 * Register (or re-register) a vendor's Shiprocket pickup location.
 *
 * Idempotency & retry-safety rules:
 *   - If Shiprocket pickup management is disabled, no-op.
 *   - If the vendor already has a registered pickup AND the registered address
 *     hash equals the current address, we preserve the existing mapping and
 *     return it (never create a duplicate).
 *   - If the vendor already has a registered pickup but the address changed, a
 *     new location is genuinely required, so we register a fresh one and
 *     replace the stored mapping.
 *   - If registration fails, status is set to 'failed' with the error saved and
 *     the vendor is NOT shipping-ready. A later admin retry re-runs this same
 *     idempotent flow, which will not create a duplicate.
 *
 * @param {string} vendorId - Internal vendor UUID
 * @param {Object} [options]
 * @param {boolean} [options.force=false] - force re-registration even if unchanged
 * @returns {Promise<Object>} the vendor's pickup state
 */
async function registerVendorPickup(vendorId, options = {}) {
  if (!SR_PICKUP_ENABLED) {
    logger.info(`[Pickup] Shiprocket pickup management disabled; skipping vendor=${vendorId}`);
    return getVendorPickupStatus(vendorId);
  }

  const vendor = await queryOne('SELECT * FROM vendors WHERE id = ?', [vendorId]);
  if (!vendor) throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });

  // Validate the pickup address up-front; mark as failed (not shipping-ready)
  // when it is incomplete rather than calling Shiprocket.
  const check = validatePickupAddress(vendor);
  if (!check.valid) {
    const error = `Pickup address incomplete: ${check.reason}`;
    logger.warn(`[Pickup] ${error} (vendor=${vendorId})`);
    await _savePickupState(vendorId, {
      shiprocket_pickup_status: PICKUP_STATUS.FAILED,
      shiprocket_pickup_error: error,
    });
    return getVendorPickupStatus(vendorId);
  }

  const currentHash = pickupAddressHash(vendor);

  // Already registered and the address is unchanged → preserve existing mapping.
  // This is the idempotency guard that prevents duplicate locations on retry.
  if (!options.force && hasRegisteredPickup(vendor)
      && vendor.shiprocket_pickup_address_hash
      && vendor.shiprocket_pickup_address_hash === currentHash) {
    logger.info(`[Pickup] Pickup already exists for vendor=${vendorId}; preserving mapping (${vendor.shiprocket_pickup_code})`);
    // Refresh the live OTP-verification flag so the preserved mapping stays current.
    if (vendor.shiprocket_pickup_verified == null) {
      await refreshVendorPickupVerification(vendorId).catch(() => {});
    }
    return getVendorPickupStatus(vendorId);
  }

  // Mark pending while we attempt (or re-attempt) registration.
  await _savePickupState(vendorId, {
    shiprocket_pickup_status: PICKUP_STATUS.PENDING,
    shiprocket_pickup_error: null,
    shiprocket_pickup_verified: null,
  });

  const pickupCode = generatePickupCode(vendorId);
  const payload = {
    pickup_location: pickupCode,
    name: vendor.pickup_name,
    email: vendor.business_email || '',
    phone: vendor.pickup_phone,
    address: vendor.pickup_line1,
    pin_code: vendor.pickup_pincode,
    city: vendor.pickup_city,
    state: vendor.pickup_state,
    country: 'India',
    address_type: 'vendor',
    vendor_name: vendor.store_name || vendor.business_name || '',
  };

  logger.info(`[Pickup] Registering pickup ${pickupCode} for vendor=${vendorId}`);
  let srData;
  let alreadyExists = false;
  try {
    const client = await _getClient();
    const res = await client.post('/settings/company/addpickup', payload);
    srData = res.data;
  } catch (err) {
    srData = err?.response?.data || {};
    // Shiprocket rejects retries for an address that already exists (possibly
    // inactive/pending verification). Treat this as "already registered" rather
    // than a hard failure so we can recover by reusing the existing pickup.
    const msg = JSON.stringify(srData);
    if (/already exists/i.test(msg)) {
      alreadyExists = true;
      logger.warn(`[Pickup] Pickup ${pickupCode} already exists on Shiprocket for vendor=${vendorId}; will reuse existing address.`);
    } else {
      const error = err?.response?.data?.message || err.message || 'Shiprocket pickup registration failed';
      logger.error(`[Pickup] Pickup creation failed for vendor=${vendorId}: ${JSON.stringify(error)}`);
      await _savePickupState(vendorId, {
        shiprocket_pickup_status: PICKUP_STATUS.FAILED,
        shiprocket_pickup_error: String(error),
      });
      return getVendorPickupStatus(vendorId);
    }
  }

  let pickupId = null;
  let pickupLocation = null;
  let existingVerified = null;

  // Parse the successful `addpickup` response. It may be the legacy shape
  // `{ pickup_location: [ { id, pickup_location } ] }` or the current shape
  // `{ success: true, address: { id, pickup_code, ... } }`.
  const created = (Array.isArray(srData?.pickup_location) && srData.pickup_location[0])
    ? srData.pickup_location[0]
    : (srData?.address || null);
  pickupId = created?.id || (srData && typeof srData.id !== 'undefined' ? srData.id : null);
  pickupLocation = created?.pickup_location || created?.pickup_code || pickupCode;

  // If the addpickup call did not yield an id (e.g. it already existed and was
  // inactive, or returned no payload), fetch the existing pickup locations and
  // reuse the one matching our pickup code. This keeps registration idempotent
  // and never creates a duplicate.
  if (!pickupId && (alreadyExists || created)) {
    try {
      const client = await _getClient();
      const listRes = await client.get('/settings/company/pickup');
      const listData = listRes.data;
      const items = Array.isArray(listData?.data?.shipping_address)
        ? listData.data.shipping_address
        : Array.isArray(listData?.shipping_address)
          ? listData.shipping_address
          : Array.isArray(listData?.data)
            ? listData.data
            : [];
      const found = items.find((p) => String(p.pickup_location || p.pickup_code || '') === String(pickupCode))
        || items.find((p) => String(p.id) === String(created?.id));
      if (found) {
        pickupId = found.id || found.address_id || found.pickup_location_id;
        pickupLocation = found.pickup_location || found.pickup_code || pickupCode;
        existingVerified = pickupVerified(found);
        logger.info(`[Pickup] Reused existing pickup ${pickupLocation} (id=${pickupId}) for vendor=${vendorId}`);
      }
    } catch (err) {
      logger.warn(`[Pickup] Could not fetch existing pickups to recover for vendor=${vendorId}: ${err.message}`);
    }
  }

  if (!pickupId) {
    const error = `Shiprocket did not return a pickup id: ${JSON.stringify(srData || {}).slice(0, 300)}`;
    logger.error(`[Pickup] ${error}`);
    await _savePickupState(vendorId, {
      shiprocket_pickup_status: PICKUP_STATUS.FAILED,
      shiprocket_pickup_error: error,
    });
    return getVendorPickupStatus(vendorId);
  }

  await _savePickupState(vendorId, {
    shiprocket_pickup_id: String(pickupId),
    shiprocket_pickup_code: pickupCode,
    shiprocket_pickup_location: pickupLocation,
    shiprocket_pickup_status: PICKUP_STATUS.REGISTERED,
    shiprocket_pickup_error: null,
    shiprocket_pickup_pincode: vendor.pickup_pincode,
    shiprocket_pickup_address_hash: currentHash,
    shiprocket_pickup_verified: pickupVerified(created) ?? existingVerified,
  });

  logger.info(`[Pickup] Pickup registered for vendor=${vendorId}: id=${pickupId} location=${pickupLocation}`);
  return getVendorPickupStatus(vendorId);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. createShipment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute package weight (kg) and dimensions (cm) for a set of order items.
 * Weight = sum(item.weight x qty) converted grams→kg; dimensions use the
 * largest value per axis across the items. Missing/zero values fall back to
 * Shiprocket-friendly minimums (0.5 kg, 10x10x10 cm).
 * @param {Array<Object>} items - order_items joined with products (weight, dimensions)
 * @returns {{ weightKg: number, length: number, width: number, height: number }}
 */
function computePackaging(items) {
  let totalWeightGrams = 0;
  const dims = { length: 0, width: 0, height: 0 };
  for (const it of items) {
    totalWeightGrams += (parseFloat(it.weight) || 0) * parseInt(it.quantity, 10);
    let d = it.dimensions;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
    if (d && typeof d === 'object') {
      dims.length = Math.max(dims.length, parseFloat(d.length) || 0);
      dims.width = Math.max(dims.width, parseFloat(d.width) || 0);
      dims.height = Math.max(dims.height, parseFloat(d.height) || 0);
    }
  }
  return {
    weightKg: Math.max(0.5, totalWeightGrams / 1000),
    length: Math.max(10, dims.length),
    width: Math.max(10, dims.width),
    height: Math.max(10, dims.height),
  };
}

/**
 * Compute this vendor's share of an order's final payable amount, i.e. the
 * COD/collectible value to pass to Shiprocket. `order.discount` already includes
 * coupon/offer/coin discounts and `order.shipping_charges` may be split across
 * vendors, so we distribute both proportionally by this vendor's item subtotal.
 * For a single-vendor order the result equals `order.total` (subtotal − discount
 * + shipping). Never send the gross subtotal — Shiprocket collects `sub_total`.
 * @param {Object} order - orders row (o.*)
 * @param {Array<Object>} items - order_items for this vendor
 * @returns {{ itemsTotal: number, discount: number, shipping: number, payable: number }}
 */
function computeVendorPayable(order, items) {
  const itemsTotal = items.reduce((sum, it) => sum + (parseFloat(it.total_price) || 0), 0);
  const subtotal = parseFloat(order.subtotal) || 0;
  const ratio = subtotal > 0 ? Math.min(1, itemsTotal / subtotal) : (items.length ? 1 : 0);
  const discount = (parseFloat(order.discount) || 0) * ratio;
  const shipping = (parseFloat(order.shipping_charges) || 0) * ratio;
  const payable = Math.max(0, itemsTotal - discount + shipping);
  return {
    itemsTotal: parseFloat(itemsTotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    shipping: parseFloat(shipping.toFixed(2)),
    payable: parseFloat(payable.toFixed(2)),
  };
}

/**
 * Create a Shiprocket order and persist shipment record to DB.
 * @param {string} orderId      - Internal order UUID
 * @param {string} orderItemId  - Internal order_item UUID (optional, can be null for whole order)
 * @param {string} vendorId     - Vendor UUID
 * @returns {Promise<Object>}   - Created shipment record
 */
async function createShipment(orderId, orderItemId, vendorId) {
  logger.info(`[ShipmentService] Creating shipment for order=${orderId}`);

  // Fetch order + address + items for this vendor
  const order = await queryOne(
    `SELECT o.*, a.name AS addr_name, a.phone AS addr_phone, a.line1, a.line2,
            a.city, a.state, a.pincode, a.country
     FROM orders o
     JOIN addresses a ON a.id = o.address_id
     WHERE o.id = ?`,
    [orderId]
  );
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

  // Get vendor pickup details
  const vendor = await queryOne(
    `SELECT v.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
     FROM vendors v JOIN users u ON u.id = v.user_id
     WHERE v.id = ?`,
    [vendorId]
  );
  if (!vendor) throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });

  // Shipping-ready guard: the vendor MUST have a successfully registered
  // Shiprocket pickup location before any order can be dispatched to Shiprocket.
  if (!hasRegisteredPickup(vendor)) {
    const status = await getVendorPickupStatus(vendor);
    throw Object.assign(
      new Error(
        `Vendor pickup location is not registered (${status.label}). Please ensure the pickup address is complete and the pickup is registered before shipping.`
      ),
      { statusCode: 400 }
    );
  }

  // OTP-verification guard: Shiprocket refuses to dispatch from a pickup whose
  // phone number has not been OTP/IVR-verified in their panel. Surface this as
  // a clear error instead of Shiprocket's raw failure. Refresh live whenever our
  // cached flag is not already '1' so the check reflects the current Shiprocket
  // state (e.g. after an admin has just completed the OTP).
  let verified = vendor.shiprocket_pickup_verified;
  if (verified !== 1) {
    verified = await refreshVendorPickupVerification(vendorId).catch(() => null);
  }
  if (verified === 0) {
    throw Object.assign(
      new Error(
        `Vendor pickup ${vendor.shiprocket_pickup_code} is not phone-OTP verified on Shiprocket. ` +
        'Verify the pickup phone in the Shiprocket panel (Settings → Pickup Addresses) before dispatching orders.'
      ),
      { statusCode: 400 }
    );
  }

  // Fetch order items for this vendor (or specific item), incl. product weight/dimensions
  const itemQuery = orderItemId
    ? 'SELECT oi.*, p.weight, p.dimensions FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.id = ? AND oi.vendor_id = ?'
    : 'SELECT oi.*, p.weight, p.dimensions FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? AND oi.vendor_id = ?';
  const itemParams = orderItemId ? [orderItemId, vendorId] : [orderId, vendorId];
  const items = await queryRows(itemQuery, itemParams);

  if (!items.length) throw Object.assign(new Error('No items found for this vendor'), { statusCode: 400 });

  // Compute package weight/dimensions from the ordered products (per vendor).
  const packaging = computePackaging(items);

  // Final payable for THIS vendor (per-vendor split of the order total).
  const vendorSummary = computeVendorPayable(order, items);

  // Build Shiprocket payload
  const srPayload = {
    order_id: order.order_number,
    order_date: new Date(order.created_at).toISOString().split('T')[0],
    // Always use the vendor's registered Shiprocket pickup location code, never
    // the vendor/store free-text name (Shiprocket rejects unknown pickup codes).
    pickup_location: vendor.shiprocket_pickup_location,
    // Channel id must be sent as an integer for Shiprocket to match the order to
    // the correct company/channel that owns the pickup location.
    channel_id: SR_CHANNEL_ID ? Number(SR_CHANNEL_ID) : undefined,
    billing_customer_name: order.addr_name,
    billing_last_name: '',
    billing_address: order.line1,
    billing_address_2: order.line2 || '',
    billing_city: order.city,
    billing_pincode: order.pincode,
    billing_state: order.state,
    billing_country: order.country,
    billing_email: '', // filled at order level if available
    billing_phone: order.addr_phone,
    shipping_is_billing: 1,
    order_items: items.map((item) => {
      // Distribute this vendor's share of the order discount onto its items so
      // Shiprocket's item-level math stays in line with the final sub_total.
      const itemShare = vendorSummary.itemsTotal > 0
        ? (parseFloat(item.total_price) || 0) / vendorSummary.itemsTotal
        : 1 / Math.max(1, items.length);
      const itemDiscount = parseFloat((vendorSummary.discount * itemShare).toFixed(2));
      return {
        name: item.product_name,
        sku: item.id,
        units: item.quantity,
        selling_price: parseFloat(item.unit_price),
        discount: itemDiscount,
      };
    }),
    payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
    // Shiprocket treats `sub_total` as the deliverable value (COD amount to
    // collect). Use the final payable after discount/shipping — never the gross
    // subtotal, otherwise Shiprocket collects/prints the pre-offer amount.
    sub_total: vendorSummary.payable,
    length: packaging.length,
    breadth: packaging.width,
    height: packaging.height,
    weight: packaging.weightKg,
  };

  const client = await _getClient();
  const srResponse = await client.post('/orders/create/adhoc', srPayload);
  const srData = srResponse.data;

  // Persist shipment to DB
  const [result] = await queryRows(
    `INSERT INTO shipments
       (order_id, order_item_id, vendor_id, shiprocket_order_id, shiprocket_id, status)
     VALUES (?, ?, ?, ?, ?, 'processing')`,
    [orderId, orderItemId || null, vendorId, String(srData.order_id), String(srData.shipment_id)]
  );

  // Fetch and return created record (id column uses UUID() default, so retry by key)
  let shipment = await queryOne('SELECT * FROM shipments WHERE id = ?', [result.insertId]);
  if (!shipment) {
    shipment = await queryOne(
      'SELECT * FROM shipments WHERE order_id = ? AND vendor_id = ? AND shiprocket_order_id = ? LIMIT 1',
      [orderId, vendorId, String(srData.order_id)]
    );
  }
  logger.info(`[ShipmentService] Shipment created: shiprocket_id=${srData.shipment_id}`);
  const created = shipment || { id: null, order_id: orderId, vendor_id: vendorId, shiprocket_order_id: String(srData.order_id), shiprocket_id: String(srData.shipment_id), status: 'processing' };
  // Surface the computed package weight/dimensions for display (not persisted).
  return { ...created, pkg_weight_kg: packaging.weightKg, pkg_length: packaging.length, pkg_width: packaging.width, pkg_height: packaging.height };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. generateAWB
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assign a courier and generate AWB for a shipment.
 * @param {string} shipmentId - Internal shipment UUID
 * @returns {Promise<Object>} - Updated shipment record
 */
async function generateAWB(shipmentId) {
  logger.info(`[ShipmentService] Generating AWB for shipment=${shipmentId}`);

  const shipment = await queryOne('SELECT * FROM shipments WHERE id = ?', [shipmentId]);
  if (!shipment) throw Object.assign(new Error('Shipment not found'), { statusCode: 404 });
  if (!shipment.shiprocket_id) throw Object.assign(new Error('Shiprocket ID missing; create shipment first'), { statusCode: 400 });

  const client = await _getClient();

  // Auto-assign best courier
  const awbRes = await client.post('/courier/assign/awb', {
    shipment_id: shipment.shiprocket_id,
  });

  const awbData = awbRes.data?.response?.data;
  const awbCode = awbData?.awb_code || awbData?.awb;
  const courierId = awbData?.courier_company_id;
  const courierName = awbData?.courier_name;
  const trackingUrl = awbData?.tracking_url || null;

  await queryRows(
    `UPDATE shipments
     SET awb_code = ?, courier_id = ?, courier_name = ?, tracking_url = ?, status = 'ready_to_ship'
     WHERE id = ?`,
    [awbCode, String(courierId), courierName, trackingUrl, shipmentId]
  );

  logger.info(`[ShipmentService] AWB assigned: ${awbCode} via ${courierName}`);
  return queryOne('SELECT * FROM shipments WHERE id = ?', [shipmentId]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. generateLabel
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch label PDF URL from Shiprocket and save to DB.
 * @param {string} shipmentId - Internal shipment UUID
 * @returns {Promise<Object>} - { label_url }
 */
async function generateLabel(shipmentId) {
  logger.info(`[ShipmentService] Generating label for shipment=${shipmentId}`);

  const shipment = await queryOne('SELECT * FROM shipments WHERE id = ?', [shipmentId]);
  if (!shipment) throw Object.assign(new Error('Shipment not found'), { statusCode: 404 });
  if (!shipment.shiprocket_id) throw Object.assign(new Error('Shiprocket ID missing'), { statusCode: 400 });

  const client = await _getClient();
  const res = await client.post('/courier/generate/label', {
    shipment_id: [shipment.shiprocket_id],
  });

  const labelUrl = res.data?.label_url;

  await queryRows('UPDATE shipments SET label_url = ? WHERE id = ?', [labelUrl, shipmentId]);
  logger.info(`[ShipmentService] Label generated: ${labelUrl}`);
  return { label_url: labelUrl };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. generateManifest
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate manifest for a shipment.
 * @param {string} shipmentId - Internal shipment UUID
 * @returns {Promise<Object>} - { manifest_url }
 */
async function generateManifest(shipmentId) {
  logger.info(`[ShipmentService] Generating manifest for shipment=${shipmentId}`);

  const shipment = await queryOne('SELECT * FROM shipments WHERE id = ?', [shipmentId]);
  if (!shipment) throw Object.assign(new Error('Shipment not found'), { statusCode: 404 });
  if (!shipment.shiprocket_id) throw Object.assign(new Error('Shiprocket ID missing'), { statusCode: 400 });

  const client = await _getClient();
  const res = await client.post('/manifests/generate', {
    shipment_id: [shipment.shiprocket_id],
  });

  const manifestUrl = res.data?.manifest_url;
  await queryRows('UPDATE shipments SET manifest_url = ? WHERE id = ?', [manifestUrl, shipmentId]);
  logger.info(`[ShipmentService] Manifest generated: ${manifestUrl}`);
  return { manifest_url: manifestUrl };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. trackShipment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get live tracking information for a shipment by AWB code.
 * Persists tracking history JSON to shipments table.
 * @param {string} awbCode - AWB code
 * @returns {Promise<Object>} - Tracking data from Shiprocket
 */
async function trackShipment(awbCode) {
  logger.info(`[ShipmentService] Tracking AWB: ${awbCode}`);

  const client = await _getClient();
  const res = await client.get(`/courier/track/awb/${awbCode}`);
  const trackingData = res.data?.tracking_data;

  // Update tracking history in DB
  await queryRows(
    'UPDATE shipments SET tracking_history = ?, status = ? WHERE awb_code = ?',
    [
      JSON.stringify(trackingData?.shipment_track || []),
      _mapSRStatus(trackingData?.shipment_status),
      awbCode,
    ]
  );

  return trackingData;
}

/**
 * Map Shiprocket shipment status string to our ENUM.
 * Accepts either the verbal status (e.g. 'IN_TRANSIT') or the numeric code
 * (e.g. 1 = AWB assigned) so both track endpoints work.
 * @param {string|number} srStatus
 * @returns {string}
 */
function _mapSRStatus(srStatus = '') {
  if (typeof srStatus === 'number' || /^\d+$/.test(String(srStatus))) {
    return _mapSRStatusNumeric(srStatus);
  }
  const map = {
    PICKUP_SCHEDULED: 'processing',
    PICKED_UP: 'shipped',
    IN_TRANSIT: 'in_transit',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    RTO_INITIATED: 'rto_initiated',
    RTO_DELIVERED: 'rto_delivered',
  };
  return map[srStatus?.toUpperCase()] || 'in_transit';
}

/**
 * Map Shiprocket's NUMERIC shipment_status code (as returned by
 * GET /courier/track/shipment/{id}) onto our shipments ENUM.
 * Codes below come from Shiprocket's status reference.
 * @param {number|string} n
 * @returns {string}
 */
function _mapSRStatusNumeric(n) {
  const code = Number(n);
  const map = {
    1: 'ready_to_ship',   // AWB Assigned / Shipment created
    2: 'processing',      // Pickup scheduled
    3: 'processing',      // Payment received
    4: 'shipped',         // Picked up
    5: 'shipped',         // Manifested / In transit
    6: 'out_for_delivery',
    7: 'delivered',
    // Delivered to RTO
    24: 'rto_delivered',
    8: 'rto_initiated',
    9: 'cancelled',
  };
  if (Object.prototype.hasOwnProperty.call(map, code)) return map[code];

  // Fall back to the numeric/verbal ranges for robustness.
  if (code >= 4 && code < 6) return 'shipped';
  if (code === 6) return 'out_for_delivery';
  if (code === 7) return 'delivered';
  if (code >= 10 && code < 20) return 'rto_initiated';
  return 'ready_to_ship';
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. cancelShipment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cancel a shipment on Shiprocket by AWB code.
 * @param {string} awbCode - AWB code
 * @returns {Promise<Object>}
 */
async function cancelShipment(awbCode) {
  logger.info(`[ShipmentService] Cancelling shipment AWB: ${awbCode}`);

  const shipment = await queryOne('SELECT * FROM shipments WHERE awb_code = ?', [awbCode]);
  if (!shipment) throw Object.assign(new Error('Shipment not found for AWB'), { statusCode: 404 });

  const client = await _getClient();
  const res = await client.post('/orders/cancel', {
    ids: [shipment.shiprocket_order_id],
  });

  await queryRows("UPDATE shipments SET status = 'cancelled' WHERE awb_code = ?", [awbCode]);
  logger.info(`[ShipmentService] Shipment cancelled for AWB: ${awbCode}`);
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. getAvailableCouriers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check courier serviceability and get available couriers.
 * @param {string} pickupPincode   - Vendor pickup pincode
 * @param {string} deliveryPincode - Customer delivery pincode
 * @param {number} weight          - Package weight in kg
 * @returns {Promise<Array>}       - List of available couriers
 */
async function getAvailableCouriers(pickupPincode, deliveryPincode, weight) {
  logger.info(`[ShipmentService] Checking serviceability: ${pickupPincode} → ${deliveryPincode} (${weight}kg)`);

  const client = await _getClient();
  const res = await client.get('/courier/serviceability/', {
    params: {
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight,
      cod: 1,
    },
  });

  return res.data?.data?.available_courier_companies || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Order-status propagation + fulfilment orchestration
// ─────────────────────────────────────────────────────────────────────────────

// Map a shipment status onto the orders/order_items status enum.
// orders.status has NO 'in_transit' value, so in-transit stays 'shipped'.
// RTO (return to origin) surfaces as return_requested / returned on the order.
const ORDER_STATUS_BY_SHIPMENT = {
  processing: 'processing',
  ready_to_ship: 'processing',
  shipped: 'shipped',
  in_transit: 'shipped',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
  rto_initiated: 'return_requested',
  rto_delivered: 'returned',
};

const ACTIVE_SHIPMENT_STATUSES = [
  'processing',
  'ready_to_ship',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'rto_initiated',
];

/**
 * Create a Shiprocket order + assign courier/AWB + generate a shipping label
 * for a given vendor's items in an order. Called automatically when a vendor
 * confirms an order.
 * @param {string} orderId
 * @param {string} vendorId
 * @returns {Promise<Object>} the persisted shipments row (with awb_code etc.)
 */
async function createOrderShipment(orderId, vendorId) {
  const shipment = await createShipment(orderId, null, vendorId);
  if (!shipment || !shipment.id) {
    throw Object.assign(new Error('Shipment creation failed'), { statusCode: 400 });
  }
  const withAWB = await generateAWB(shipment.id);
  try {
    await generateLabel(withAWB.id);
  } catch (err) {
    logger.warn(`[ShipmentService] Label generation skipped for ${withAWB.id}: ${err.message}`);
  }
  return queryOne('SELECT * FROM shipments WHERE id = ?', [withAWB.id]);
}

/**
 * Propagate a shipment's status to order_items (per vendor) and orders.
 * Idempotent: safe to call repeatedly.
 */
async function applyShipmentStatusToOrder(shipment) {
  if (!shipment || !shipment.order_id || !shipment.vendor_id) return;
  const orderStatus = ORDER_STATUS_BY_SHIPMENT[shipment.status];
  if (!orderStatus) return;

  if (shipment.status === 'delivered') {
    await queryRows(
      "UPDATE order_items SET status = 'delivered' WHERE order_id = ? AND vendor_id = ?",
      [shipment.order_id, shipment.vendor_id]
    );
    await queryRows(
      "UPDATE orders SET status = 'delivered', delivered_at = COALESCE(delivered_at, NOW()) WHERE id = ?",
      [shipment.order_id]
    );
  } else {
    await queryRows(
      'UPDATE order_items SET status = ? WHERE order_id = ? AND vendor_id = ?',
      [orderStatus, shipment.order_id, shipment.vendor_id]
    );
    await queryRows('UPDATE orders SET status = ? WHERE id = ?', [orderStatus, shipment.order_id]);
  }
  // Real-time push to customer, vendor(s) and admin apps.
  const { broadcastOrderStatus } = require('../socket/socket');
  broadcastOrderStatus(shipment.order_id, orderStatus, {
    vendorId: shipment.vendor_id,
    itemStatus: orderStatus,
    awb: shipment.awb_code || null,
  }).catch(() => {});
  return orderStatus;
}

/**
 * Run delivery side-effects once when a shipment transitions to delivered:
 * COD auto-capture, referral rewards and the delivered confirmation email.
 */
async function handleDeliveredSideEffects(shipment) {
  try {
    // COD auto-capture (idempotent)
    const order = await queryOne('SELECT payment_method, payment_status FROM orders WHERE id = ?', [shipment.order_id]);
    if (order && order.payment_method === 'cod' && order.payment_status !== 'paid') {
      await queryRows("UPDATE orders SET payment_status = 'paid' WHERE id = ? AND payment_method = 'cod'", [shipment.order_id]);
      await queryRows("UPDATE payments SET status = 'captured' WHERE order_id = ? AND status IN ('pending','authorized')", [shipment.order_id]);
    }
  } catch (err) {
    logger.warn(`[ShipmentService] COD capture failed for ${shipment.order_id}: ${err.message}`);
  }

  const { processDeliveryRewards } = require('./referral.service');
  processDeliveryRewards(shipment.order_id).catch(() => {});

  try {
    const emailService = require('./email.service');
    const o = await queryOne(
      `SELECT o.order_number, o.id, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?`,
      [shipment.order_id]
    );
    if (o) {
      await emailService.sendOrderDeliveredEmail(o.email, o.name, { order_number: o.order_number, id: o.id });
    }
  } catch (err) {
    logger.warn(`[ShipmentService] Delivered email failed for ${shipment.order_id}: ${err.message}`);
  }
}

/**
 * Refresh a single shipment's live Shiprocket status and propagate it.
 * Returns the updated shipment row.
 */
async function syncShipment(shipmentId) {
  const shipment = await queryOne('SELECT * FROM shipments WHERE id = ?', [shipmentId]);
  if (!shipment) return shipment;

  // No AWB known yet: try to discover it (and the courier/status) from
  // Shiprocket using the shipment_id, e.g. when the AWB was assigned directly
  // in the Shiprocket panel or via a different flow than our /awb endpoint.
  if (!shipment.awb_code && shipment.shiprocket_id) {
    return syncShipmentByShiprocketId(shipmentId);
  }
  if (!shipment.awb_code) return shipment;

  const before = shipment.status;
  try {
    await trackShipment(shipment.awb_code);
  } catch (err) {
    logger.warn(`[ShipmentService] Track failed for shipment ${shipmentId}: ${err.message}`);
    return shipment;
  }
  const updated = await queryOne('SELECT * FROM shipments WHERE id = ?', [shipmentId]);
  if (!updated) return shipment;
  // COD capture (if freshly delivered) must run BEFORE the propagate + broadcast
  // below so the real-time payload carries 'paid' instead of a stale 'pending'.
  if (updated.status === 'delivered' && before !== 'delivered') {
    await handleDeliveredSideEffects(updated);
  }
  // Only propagate (and thus socket-broadcast) when the status actually changed,
  // so each transition produces one real-time event instead of per-poll spam.
  if (updated.status !== before) {
    await applyShipmentStatusToOrder(updated);
  }
  return updated;
}

/**
 * Discover an AWB that was assigned on Shiprocket (outside our /awb flow) and
 * refresh the live status for a shipment using GET /courier/track/shipment/{id}.
 * Back-fills awb_code / courier / tracking URL, then propagates the order status
 * and emits a real-time update when the state actually changes.
 */
async function syncShipmentByShiprocketId(shipmentId) {
  const shipment = await queryOne('SELECT * FROM shipments WHERE id = ?', [shipmentId]);
  if (!shipment || !shipment.shiprocket_id) return shipment;
  const beforeStatus = shipment.status;
  const beforeAwb = shipment.awb_code;

  let client;
  try {
    client = await _getClient();
    const res = await client.get(`/courier/track/shipment/${shipment.shiprocket_id}`);
    const td = res.data?.tracking_data;
    const t = td?.shipment_track?.[0];
    if (!t) return shipment;

    const awbCode = t.awb_code || null;
    const courierName = t.courier_name || null;
    const courierId = t.courier_company_id != null ? String(t.courier_company_id) : null;
    const trackingUrl = td?.track_url || (awbCode ? `https://shiprocket.co/tracking/${awbCode}` : null);
    const status = _mapSRStatusNumeric(td?.shipment_status);

    await queryRows(
      `UPDATE shipments
       SET awb_code = COALESCE(?, awb_code),
           courier_id = COALESCE(?, courier_id),
           courier_name = COALESCE(?, courier_name),
           tracking_url = COALESCE(?, tracking_url),
           status = ?,
           tracking_history = ?
       WHERE id = ?`,
      [
        awbCode,
        courierId,
        courierName,
        trackingUrl,
        status,
        JSON.stringify(td?.shipment_track || []),
        shipmentId,
      ]
    );
    logger.info(`[ShipmentService] Synced by shiprocket_id=${shipment.shiprocket_id} awb=${awbCode} courier=${courierName} status=${status}`);

    const updated = await queryOne('SELECT * FROM shipments WHERE id = ?', [shipmentId]);
    // COD capture (if freshly delivered) BEFORE propagate + broadcast so the
    // real-time payload carries 'paid' instead of a stale 'pending'.
    if (updated && updated.status === 'delivered' && beforeStatus !== 'delivered') {
      await handleDeliveredSideEffects(updated);
    }
    // Propagate + broadcast when anything meaningful changed (AWB discovered or status moved).
    if (updated && (updated.awb_code !== beforeAwb || updated.status !== beforeStatus)) {
      await applyShipmentStatusToOrder(updated);
    }
    return updated;
  } catch (err) {
    logger.warn(`[ShipmentService] Sync-by-id failed for ${shipmentId}: ${err.message}`);
    return shipment;
  }
}

/**
 * Background job: refresh live Shiprocket status for all active shipments
 * and propagate changes to order_items/orders.
 * Includes shipments that received an AWB directly on Shiprocket (awb_code
 * still null but shiprocket_id present) so those statuses stay in sync too.
 * @returns {Promise<number>} number of shipments processed
 */
async function syncActiveShipments() {
  const active = await queryRows(
    `SELECT * FROM shipments
     WHERE id IN (
        SELECT id FROM shipments
        WHERE awb_code IS NOT NULL AND status IN (?, ?, ?, ?, ?, ?)
     ) OR (shiprocket_id IS NOT NULL AND awb_code IS NULL)
     ORDER BY updated_at ASC LIMIT 200`,
    ACTIVE_SHIPMENT_STATUSES
  );
  let processed = 0;
  for (const s of active) {
    try {
      await syncShipment(s.id);
      processed++;
    } catch (err) {
      logger.warn(`[ShipmentService] Sync failed for ${s.id}: ${err.message}`);
    }
  }
  return processed;
}

module.exports = {
  authenticate,
  registerVendorPickup,
  getVendorPickupStatus,
  refreshVendorPickupVerification,
  hasRegisteredPickup,
  generatePickupCode,
  validatePickupAddress,
  createShipment,
  createOrderShipment,
  generateAWB,
  generateLabel,
  generateManifest,
  trackShipment,
  syncShipment,
  syncShipmentByShiprocketId,
  syncActiveShipments,
  cancelShipment,
  getAvailableCouriers,
};

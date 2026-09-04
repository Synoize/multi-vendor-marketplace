/**
 * Damini Marketplace - Pincode Delivery Check Service
 * Uses the free India Post pincode lookup API (api.postalpincode.in) to
 * validate a delivery pincode and estimate delivery days by region.
 *
 * The India Post API requires no API key:
 *   GET https://api.postalpincode.in/pincode/{pincode}
 */

'use strict';

const axios = require('axios');
const config = require('config');
const logger = require('../utils/logger.util');

const POSTAL_API = process.env.POSTAL_API_URL || 'https://api.postalpincode.in/pincode';

// Delivery day estimates by distance tier — read from config YAML
// (`delivery.*`) and overridable at runtime via the DELIVERY_* env vars.
const dconf = (envKey, yamlKey, fallback) => {
  if (process.env[envKey] !== undefined && process.env[envKey] !== '') {
    return Number(process.env[envKey]);
  }
  return config.has(`delivery.${yamlKey}`) ? Number(config.get(`delivery.${yamlKey}`)) : fallback;
};

const LOCAL_DAYS = dconf('DELIVERY_LOCAL_DAYS', 'localDays', 3);            // same district / very close
const SAME_STATE_DAYS = dconf('DELIVERY_SAME_STATE_DAYS', 'sameStateDays', 5);   // same state
const CROSS_STATE_DAYS = dconf('DELIVERY_CROSS_STATE_DAYS', 'crossStateDays', 7); // different states
const DEFAULT_DAYS = dconf('DELIVERY_DEFAULT_DAYS', 'defaultDays', 9);        // pickup pincode unknown/failed

// A small in-memory cache so repeated lookups for the same pincode don't
// hammer the free postal API. Keyed by pincode.
const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// A small in-memory cache of pickup -> delivery estimates keyed by
// `${pickup}_${delivery}` so repeat checks are instant.
const estimateCache = new Map();
const EST_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const METRO_STATES = new Set([
  'MAHARASHTRA', 'DELHI', 'NCT OF DELHI', 'KARNATAKA', 'TAMIL NADU',
  'WEST BENGAL', 'TELANGANA', 'GUJARAT',
]);

/**
 * Look up a pincode via the free India Post API.
 * @param {string} pincode - 6-digit pincode
 * @returns {Promise<{status: string, state?: string, circle?: string, district?: string, name?: string}>}
 */
async function lookupPincode(pincode) {
  const cached = cache.get(pincode);
  if (cached && Date.now() - cached.t < CACHE_TTL_MS) {
    return cached.d;
  }

  let result = { status: 'error' };
  try {
    const res = await axios.get(`${POSTAL_API}/${pincode}`, { timeout: 12000 });
    const body = Array.isArray(res.data) ? res.data[0] : res.data;
    if (body && body.Status === 'Success' && Array.isArray(body.PostOffice) && body.PostOffice.length) {
      const po = body.PostOffice[0];
      result = {
        status: 'success',
        name: po.Name,
        state: po.State,
        circle: po.Circle,
        district: po.District,
        division: po.Division,
      };
    } else {
      result = { status: 'not_found' };
    }
  } catch (err) {
    logger.warn(`Pincode lookup failed for ${pincode}: ${err.message}`);
    result = { status: 'error' };
  }

  cache.set(pincode, { d: result, t: Date.now() });
  return result;
}

const norm = (v) => String(v || '').trim().toUpperCase();

/**
 * Estimate delivery days based on the distance between the vendor's pickup
 * pincode and the customer's delivery pincode.
 *
 *  - Same district / exact match             -> LOCAL_DAYS
 *  - Same state                             -> SAME_STATE_DAYS
 *  - Both metro states (different states)   -> metro-ish CROSS_STATE_DAYS
 *  - Different states / everything else     -> CROSS_STATE_DAYS
 *
 * @param {object} pickup - lookup result for the vendor's pickup pincode
 * @param {object} delivery - lookup result for the customer's delivery pincode
 * @returns {number} estimated delivery days
 */
function estimateDaysFromDistance(pickup, delivery) {
  if (pickup.status !== 'success' || delivery.status !== 'success') {
    return DEFAULT_DAYS;
  }

  const pState = norm(pickup.state);
  const dState = norm(delivery.state);
  const pDist = norm(pickup.district);
  const dDist = norm(delivery.district);

  // Same district (covers exact pincode and nearby) — fastest.
  if (pState && pState === dState && pDist && pDist === dDist) {
    return LOCAL_DAYS;
  }

  // Same state.
  if (pState && pState === dState) {
    return SAME_STATE_DAYS;
  }

  // Cross-state but both metro hubs get a slightly faster estimate.
  const pickMetro = [...METRO_STATES].some((m) => pState.includes(m));
  const delMetro = [...METRO_STATES].some((m) => dState.includes(m));
  if (pickMetro && delMetro) {
    return Math.max(LOCAL_DAYS, Math.min(CROSS_STATE_DAYS, SAME_STATE_DAYS));
  }

  return CROSS_STATE_DAYS;
}

/**
 * Fallback estimate (used when the vendor's pickup pincode is unknown or
 * cannot be resolved) — purely region based.
 * @param {object} info - lookup result for the delivery pincode
 * @returns {number} estimated delivery days
 */
function estimateDays(info) {
  if (info.status === 'success') {
    const state = (info.state || '').toUpperCase();
    if ([...METRO_STATES].some((m) => state.includes(m))) {
      return SAME_STATE_DAYS;
    }
    return CROSS_STATE_DAYS;
  }
  return DEFAULT_DAYS;
}

/**
 * Check delivery availability from a vendor pickup pincode to a customer
 * delivery pincode.
 *
 * @param {string} pincode - customer's 6-digit delivery pincode
 * @param {string} [pickupPincode] - vendor's 6-digit pickup pincode
 * @returns {Promise<{deliverable: boolean, days: number, pincode: string, state?: string, city?: string}>}
 */
async function checkDelivery(pincode, pickupPincode = null) {
  if (!/^\d{6}$/.test(pincode)) {
    return { deliverable: false, days: 0, pincode };
  }

  const info = await lookupPincode(pincode);
  if (info.status !== 'success') {
    return { deliverable: false, days: 0, pincode };
  }

  const hasPickup = pickupPincode && /^\d{6}$/.test(String(pickupPincode));

  // Cache key so repeated checks for the same route are instant.
  const cacheKey = hasPickup ? `${pickupPincode}_${pincode}` : `_${pincode}`;
  const cached = estimateCache.get(cacheKey);
  if (cached && Date.now() - cached.t < EST_CACHE_TTL_MS) {
    return cached.d;
  }

  let days = estimateDays(info);
  if (hasPickup) {
    const pickup = await lookupPincode(pickupPincode);
    days = estimateDaysFromDistance(pickup, info);
  }

  const result = {
    deliverable: true,
    days,
    pincode,
    state: info.state,
    city: info.district || info.name,
    ...(hasPickup ? { pickupPincode } : {}),
  };
  estimateCache.set(cacheKey, { d: result, t: Date.now() });
  return result;
}

module.exports = { checkDelivery, lookupPincode, estimateDays, estimateDaysFromDistance };


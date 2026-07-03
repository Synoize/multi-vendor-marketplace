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
const SR_BASE = config.get('shiprocket.baseUrl');
const SR_EMAIL = config.get('shiprocket.email');
const SR_PASSWORD = config.get('shiprocket.password');
const SR_CHANNEL_ID = config.get('shiprocket.channelId');

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
// 2. createShipment
// ─────────────────────────────────────────────────────────────────────────────

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

  // Fetch order items for this vendor (or specific item)
  const itemQuery = orderItemId
    ? 'SELECT * FROM order_items WHERE id = ? AND vendor_id = ?'
    : 'SELECT * FROM order_items WHERE order_id = ? AND vendor_id = ?';
  const itemParams = orderItemId ? [orderItemId, vendorId] : [orderId, vendorId];
  const items = await queryRows(itemQuery, itemParams);

  if (!items.length) throw Object.assign(new Error('No items found for this vendor'), { statusCode: 400 });

  // Build Shiprocket payload
  const srPayload = {
    order_id: order.order_number,
    order_date: new Date(order.created_at).toISOString().split('T')[0],
    pickup_location: vendor.store_name || vendor.business_name,
    channel_id: SR_CHANNEL_ID || undefined,
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
    order_items: items.map((item) => ({
      name: item.product_name,
      sku: item.id,
      units: item.quantity,
      selling_price: parseFloat(item.unit_price),
    })),
    payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
    sub_total: parseFloat(order.subtotal),
    length: 10,
    breadth: 10,
    height: 10,
    weight: 0.5,
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

  // Fetch and return created record
  const shipment = await queryOne('SELECT * FROM shipments WHERE id = ?', [result?.insertId ? result.insertId : srData.shipment_id]);
  logger.info(`[ShipmentService] Shipment created: shiprocket_id=${srData.shipment_id}`);
  return shipment || { shiprocket_order_id: srData.order_id, shiprocket_id: srData.shipment_id };
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
 * @param {string} srStatus
 * @returns {string}
 */
function _mapSRStatus(srStatus = '') {
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

module.exports = {
  authenticate,
  createShipment,
  generateAWB,
  generateLabel,
  generateManifest,
  trackShipment,
  cancelShipment,
  getAvailableCouriers,
};

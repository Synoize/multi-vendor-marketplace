const { pool } = require('../database/connection');

let cached = null;

const getShippingConfig = async () => {
  if (cached) return cached;
  try {
    const [rows] = await pool.query(
      'SELECT `key`, `value` FROM platform_settings WHERE `key` IN (?, ?)',
      ['shipping_charge', 'free_shipping_threshold']
    );
    const config = { shippingCharge: 40, freeShippingThreshold: 499 };
    for (const row of rows) {
      if (row.key === 'shipping_charge') config.shippingCharge = parseFloat(row.value) || 40;
      if (row.key === 'free_shipping_threshold') config.freeShippingThreshold = parseFloat(row.value) || 499;
    }
    cached = config;
    return config;
  } catch {
    return { shippingCharge: 40, freeShippingThreshold: 499 };
  }
};

const clearShippingCache = () => { cached = null; };

module.exports = { getShippingConfig, clearShippingCache };

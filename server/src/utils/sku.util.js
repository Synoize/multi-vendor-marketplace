/**
 * Damini Marketplace - SKU Generator Utility
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique SKU for a product variant
 * Format: DMN-{CATEGORY}-{RANDOM}
 * @param {string} categorySlug - Category slug
 * @param {string} vendorId - Vendor ID (first 4 chars)
 * @returns {string} SKU string
 */
const generateSKU = (categorySlug = 'GEN', vendorId = '') => {
  const cat = categorySlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const vid = vendorId.replace(/-/g, '').slice(0, 4).toUpperCase();
  const random = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `DMN-${cat}-${vid}-${random}`;
};

/**
 * Generate order number
 * Format: ORD-YYYYMMDD-RANDOM6
 */
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${dateStr}-${random}`;
};

/**
 * Generate referral code for user
 * Format: DMN + 8 alphanumeric chars
 */
const generateReferralCode = () => {
  return 'DMN' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

/**
 * Generate OTP
 * @param {number} length - OTP length (default 6)
 */
const generateOTP = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

/**
 * Create slug from text
 */
const createSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

module.exports = { generateSKU, generateOrderNumber, generateReferralCode, generateOTP, createSlug };

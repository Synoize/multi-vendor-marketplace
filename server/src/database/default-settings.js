/**
 * Damini Marketplace - Default Platform Settings
 * Single source of truth for every platform setting. Inserted into the
 * platform_settings table on boot if missing (never overwrites admin edits).
 */

const { query } = require("./connection");
const logger = require("../utils/logger.util");

const DEFAULT_SETTINGS = [
  // ─── Brand ──────────────────────────────────────────────────────────────
  ["site_name", "The Damini Edit", "Site Name", "string"],
  ["site_tagline", "India's Favourite Marketplace", "Site Tagline", "string"],
  ["site_domain", "thedaminiedit.com", "Site Domain", "string"],

  // ─── Contact ────────────────────────────────────────────────────────────
  [
    "support_email",
    "supportthedaminiedit@gmail.com",
    "Support Email (Customer Care)",
    "string",
  ],
  [
    "business_email",
    "thedaminiedit3094@gmail.com",
    "Business Enquiries Email",
    "string",
  ],
  ["support_phone", "+91 8485833094", "Support Phone", "string"],
  [
    "whatsapp_number",
    "918485833094",
    "WhatsApp Number (with country code, no +)",
    "string",
  ],
  [
    "registered_address",
    "53H4+3CH The Damini Edit, Opposite Chubeji Katiya Bhandar, Gittikhadan Chowk, Nagpur, Maharashtra – 440013, India",
    "Registered Office Address",
    "string",
  ],
  ["gstin", "27AYDPT0267H1Z9", "GSTIN", "string"],
  ["working_hours", "Mon – Sat : 9:00 AM – 8:00 PM", "Working Hours", "string"],

  // ─── Social links ───────────────────────────────────────────────────────
  [
    "facebook_url",
    "https://www.facebook.com/share/19YabhRKct/",
    "Facebook URL",
    "string",
  ],
  [
    "instagram_url",
    "https://www.instagram.com/the_damini_edit",
    "Instagram URL",
    "string",
  ],
  [
    "youtube_url",
    "https://www.youtube.com/@thedaminiedit",
    "YouTube URL",
    "string",
  ],
  ["twitter_url", "", "Twitter / X URL", "string"],

  // ─── Operations ─────────────────────────────────────────────────────────
  ["commission_rate", "3", "Platform Commission Rate (%)", "number"],
  ["min_payout", "500", "Minimum Vendor Payout (₹)", "number"],
  ["maintenance_mode", "false", "Maintenance Mode", "boolean"],
  ["free_shipping_threshold", "499", "Free Shipping Above (₹)", "number"],
  ["shipping_charge", "40", "Standard Shipping Charge (₹)", "number"],
  ["max_cart_qty", "10", "Max Quantity per Cart Item", "number"],
  [
    "cancel_window_minutes",
    "15",
    "Order Cancellation Window (minutes)",
    "number",
  ],
  ["online_pay_off", "199", "Online Payment Offer (₹ Off)", "number"],
];

// Keys safe to expose publicly (no secrets). Everything here is rendered on
// the storefront or needed for checkout logic.
const PUBLIC_SETTING_KEYS = [
  "site_name",
  "site_tagline",
  "site_domain",
  "support_email",
  "business_email",
  "support_phone",
  "whatsapp_number",
  "registered_address",
  "gstin",
  "working_hours",
  "facebook_url",
  "instagram_url",
  "youtube_url",
  "twitter_url",
  "free_shipping_threshold",
  "shipping_charge",
  "online_pay_off",
  "max_cart_qty",
  "cancel_window_minutes",
  "maintenance_mode",
];

/**
 * Idempotently insert any settings that don't exist yet.
 * Existing rows are never overwritten so admin edits survive redeploys.
 */
async function ensureDefaultSettings() {
  try {
    const placeholders = DEFAULT_SETTINGS.map(() => "(?, ?, ?, ?)").join(", ");
    const params = DEFAULT_SETTINGS.flat();
    await query(
      `INSERT INTO platform_settings (\`key\`, \`value\`, label, \`type\`)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE \`key\` = \`key\``,
      params,
    );
    logger.info(
      `✅ Platform settings ensured (${DEFAULT_SETTINGS.length} keys)`,
    );
  } catch (err) {
    logger.warn(
      `⚠️ Could not ensure default platform settings: ${err.message}`,
    );
  }
}

module.exports = {
  DEFAULT_SETTINGS,
  PUBLIC_SETTING_KEYS,
  ensureDefaultSettings,
};

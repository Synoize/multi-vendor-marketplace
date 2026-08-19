/**
 * Damini Marketplace — Email Service
 * ─────────────────────────────────────────────────────────────
 * Sends all transactional emails via Gmail SMTP using Nodemailer.
 * Brand colours: Primary #2874F0 (blue), Accent #FB641B (orange)
 *
 * All functions are async and resolve when the mail is accepted
 * by the SMTP server (or reject with the transport error).
 */

"use strict";

const nodemailer = require("nodemailer");
const config = require("config");
const logger = require("../utils/logger.util");

// ─── Transport ───────────────────────────────────────────────
const mailCfg = config.get("mail");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: mailCfg.user,
    pass: mailCfg.password, // Gmail App Password
  },
});

// Verify transport once at startup (non-fatal)
transporter
  .verify()
  .then(() => {
    logger.info("Email transport ready");
  })
  .catch((err) => {
    logger.warn("Email transport not ready:", err.message);
  });

// ─── Shared styles ───────────────────────────────────────────
const BRAND_PRIMARY = "#2874F0";
const BRAND_ACCENT = "#FB641B";
const BRAND_NAME = "Damini";

/**
 * Build the outer HTML shell shared by every email.
 * @param {string} title   - Browser/preview title
 * @param {string} body    - Inner HTML content
 * @returns {string} Full HTML document string
 */
const buildHtml = (title, body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f4f6fb; font-family: 'Segoe UI', Arial, sans-serif; color: #333; }
    .wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.08); }
    .header  { background: ${BRAND_PRIMARY}; padding: 28px 32px; text-align: center; }
    .header h1 { color: #fff; font-size: 24px; letter-spacing: 1px; }
    .header span { color: ${BRAND_ACCENT}; }
    .body    { padding: 36px 40px; }
    .body p  { line-height: 1.7; margin-bottom: 14px; color: #444; }
    .body h2 { font-size: 20px; color: ${BRAND_PRIMARY}; margin-bottom: 18px; }
    .otp-box { font-size: 38px; font-weight: 700; letter-spacing: 10px; color: ${BRAND_PRIMARY};
               background: #eef3ff; border: 2px dashed ${BRAND_PRIMARY}; border-radius: 8px;
               text-align: center; padding: 16px 0; margin: 24px 0; }
    .btn     { display: inline-block; background: ${BRAND_ACCENT}; color: #fff !important; padding: 13px 32px;
               border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none; margin: 20px 0; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table th, .info-table td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #eee; font-size: 14px; }
    .info-table th { background: #f0f4ff; color: ${BRAND_PRIMARY}; font-weight: 600; }
    .badge   { display: inline-block; background: ${BRAND_PRIMARY}; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .badge-green { background: #2e7d32; }
    .badge-orange { background: ${BRAND_ACCENT}; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    .footer  { background: #f0f4ff; padding: 20px 32px; text-align: center; font-size: 12px; color: #888; }
    .footer a { color: ${BRAND_PRIMARY}; text-decoration: none; }
    .highlight { color: ${BRAND_ACCENT}; font-weight: 700; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${BRAND_NAME}<span>.</span></h1>
      <p style="color:#cce0ff;font-size:13px;margin-top:4px;">India's Fastest Growing Marketplace</p>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${BRAND_NAME} Marketplace Pvt. Ltd. All rights reserved.</p>
      <p style="margin-top:6px;">
        <a href="#">Privacy Policy</a> &nbsp;|&nbsp;
        <a href="#">Terms of Service</a> &nbsp;|&nbsp;
        <a href="#">Help Centre</a>
      </p>
    </div>
  </div>
</body>
</html>`;

/**
 * Low-level send helper.
 * @param {string} to      - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html    - Full HTML body
 */
const sendMail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"${BRAND_NAME} Marketplace" <${mailCfg.user}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to} | msgId: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
    throw err;
  }
};

// ─── Public Email Functions ───────────────────────────────────

/**
 * Send OTP verification email.
 * @param {string} email
 * @param {string} name
 * @param {string} otp   - 6-digit code
 */
const sendOTPEmail = async (email, name, otp) => {
  const subject = `${otp} is your ${BRAND_NAME} verification code`;
  const html = buildHtml(
    "Verify Your Email",
    `
    <h2>Verify Your Email Address</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Welcome to <strong>${BRAND_NAME}</strong>! Use the OTP below to verify your email address.
       This code expires in <span class="highlight">10 minutes</span>.</p>
    <div class="otp-box">${otp}</div>
    <p>If you did not create an account with us, you can safely ignore this email.</p>
    <hr class="divider" />
    <p style="font-size:13px;color:#888;">Never share this code with anyone — our team will never ask for it.</p>
  `,
  );
  return sendMail(email, subject, html);
};

/**
 * Send welcome email after successful email verification.
 * @param {string} email
 * @param {string} name
 */
const sendWelcomeEmail = async (email, name) => {
  const subject = `Welcome to ${BRAND_NAME}! Your account is ready`;
  const html = buildHtml(
    "Welcome to Damini",
    `
    <h2>Welcome aboard, ${name}!</h2>
    <p>Your email has been verified successfully. You are now part of the <strong>${BRAND_NAME}</strong> family.</p>
    <ul style="padding-left:20px;line-height:2;color:#555;">
      <li>Shop from thousands of verified vendors</li>
      <li>Earn wallet cashback on every order</li>
      <li>Save your favourites to your wishlist</li>
      <li>Track your orders in real time</li>
    </ul>
    <a class="btn" href="https://thedaminiedit.com/products">Start Shopping</a>
    <p style="font-size:13px;color:#888;">Happy shopping! The ${BRAND_NAME} Team</p>
  `,
  );
  return sendMail(email, subject, html);
};

/**
 * Send order placed confirmation email.
 * @param {string} email
 * @param {string} name
 * @param {Object} order - { order_number, id, total, items[], payment_method, estimated_delivery }
 */
const sendOrderPlacedEmail = async (email, name, order) => {
  const itemRows = (order.items || [])
    .map(
      (item) => `
    <tr>
      <td>${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ""}</td>
      <td>${item.quantity}</td>
      <td>Rs.${Number(item.unit_price).toLocaleString("en-IN")}</td>
      <td>Rs.${Number(item.total_price).toLocaleString("en-IN")}</td>
    </tr>`,
    )
    .join("");

  const subject = `Order Confirmed #${order.order_number} - ${BRAND_NAME}`;
  const html = buildHtml(
    "Order Confirmed",
    `
    <h2>Your Order is Confirmed!</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thank you for shopping with <strong>${BRAND_NAME}</strong>! Your order has been placed successfully.</p>
    <table class="info-table">
      <tr><th>Order Number</th><td><span class="badge">#${order.order_number}</span></td></tr>
      <tr><th>Payment Method</th><td>${(order.payment_method || "").toUpperCase()}</td></tr>
      <tr><th>Order Total</th><td><strong class="highlight">Rs.${Number(order.total).toLocaleString("en-IN")}</strong></td></tr>
      ${order.estimated_delivery ? `<tr><th>Est. Delivery</th><td>${order.estimated_delivery}</td></tr>` : ""}
    </table>
    <h3 style="margin-bottom:10px;color:#555;">Items Ordered</h3>
    <table class="info-table">
      <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <a class="btn" href="https://thedaminiedit.com/orders/${order.id}">Track Order</a>
    <p style="font-size:13px;color:#888;">You will receive an email when your order is shipped.</p>
  `,
  );
  return sendMail(email, subject, html);
};

/**
 * Send order shipped notification.
 * @param {string} email
 * @param {string} name
 * @param {Object} order     - { order_number, id }
 * @param {string} trackingId - AWB / tracking number
 */
const sendOrderShippedEmail = async (email, name, order, trackingId) => {
  const subject = `Your Order #${order.order_number} is on its way!`;
  const html = buildHtml(
    "Order Shipped",
    `
    <h2>Your Order Has Shipped!</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your order <strong>#${order.order_number}</strong> has been picked up by our delivery partner.</p>
    <table class="info-table">
      <tr><th>Order Number</th><td><span class="badge">#${order.order_number}</span></td></tr>
      <tr><th>Tracking ID</th><td><strong>${trackingId}</strong></td></tr>
      <tr><th>Status</th><td><span class="badge badge-orange">Shipped</span></td></tr>
    </table>
    <a class="btn" href="https://thedaminiedit.com/orders/${order.id}">Live Track</a>
    <p style="font-size:13px;color:#888;">Delivery attempt between 9 AM - 9 PM. Please ensure someone is available.</p>
  `,
  );
  return sendMail(email, subject, html);
};

/**
 * Send order delivered confirmation.
 * @param {string} email
 * @param {string} name
 * @param {Object} order - { order_number, id }
 */
const sendOrderDeliveredEmail = async (email, name, order) => {
  const subject = `Order #${order.order_number} Delivered! Rate your experience`;
  const html = buildHtml(
    "Order Delivered",
    `
    <h2>Your Order Has Been Delivered!</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your order <strong>#${order.order_number}</strong> has been successfully delivered. We hope you love your purchase!</p>
    <table class="info-table">
      <tr><th>Order Number</th><td><span class="badge">#${order.order_number}</span></td></tr>
      <tr><th>Status</th><td><span class="badge badge-green">Delivered</span></td></tr>
    </table>
    <p>Share your review and help other shoppers!</p>
    <a class="btn" href="https://thedaminiedit.com/orders/${order.id}/review">Write a Review</a>
    <p style="font-size:13px;color:#888;">
      If you have any issue, you can raise a return request from your order details page within the return window.
    </p>
  `,
  );
  return sendMail(email, subject, html);
};

/**
 * Send order cancellation email.
 * @param {string} email
 * @param {string} name
 * @param {Object} order - { order_number, total, cancel_reason }
 */
const sendOrderCancelledEmail = async (email, name, order) => {
  const subject = `Order #${order.order_number} Cancelled - ${BRAND_NAME}`;
  const html = buildHtml(
    "Order Cancelled",
    `
    <h2>Order Cancelled</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your order <strong>#${order.order_number}</strong> has been cancelled as requested.</p>
    <table class="info-table">
      <tr><th>Order Number</th><td><span class="badge">#${order.order_number}</span></td></tr>
      <tr><th>Cancelled Amount</th><td class="highlight">Rs.${Number(order.total).toLocaleString("en-IN")}</td></tr>
      ${order.cancel_reason ? `<tr><th>Reason</th><td>${order.cancel_reason}</td></tr>` : ""}
    </table>
    <p>If you paid online, a <strong>refund will be processed within 5-7 business days</strong>.</p>
    <a class="btn" href="https://thedaminiedit.com/products">Continue Shopping</a>
    <p style="font-size:13px;color:#888;">Questions? Contact support@thedaminiedit.com</p>
  `,
  );
  return sendMail(email, subject, html);
};

/**
 * Send refund initiated email.
 * @param {string} email
 * @param {string} name
 * @param {Object} refund - { id, amount, reason, order_number }
 */
const sendRefundInitiatedEmail = async (email, name, refund) => {
  const subject = `Refund of Rs.${Number(refund.amount).toLocaleString("en-IN")} Initiated - ${BRAND_NAME}`;
  const html = buildHtml(
    "Refund Initiated",
    `
    <h2>Refund Initiated</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>We have initiated a refund for your order. Details:</p>
    <table class="info-table">
      ${refund.order_number ? `<tr><th>Order Number</th><td>#${refund.order_number}</td></tr>` : ""}
      <tr><th>Refund Amount</th><td class="highlight">Rs.${Number(refund.amount).toLocaleString("en-IN")}</td></tr>
      <tr><th>Reason</th><td>${refund.reason}</td></tr>
      <tr><th>Timeline</th><td>5-7 business days</td></tr>
    </table>
    <p>The refund will be credited to your original payment method.</p>
    <a class="btn" href="https://thedaminiedit.com/orders">View Orders</a>
  `,
  );
  return sendMail(email, subject, html);
};

/**
 * Send vendor payout released notification.
 * @param {string} email
 * @param {string} vendorName
 * @param {number} amount - Payout amount in INR
 */
const sendPayoutReleasedEmail = async (email, vendorName, amount) => {
  const subject = `Payout of Rs.${Number(amount).toLocaleString("en-IN")} Released - ${BRAND_NAME}`;
  const html = buildHtml(
    "Payout Released",
    `
    <h2>Your Payout Has Been Released!</h2>
    <p>Hi <strong>${vendorName}</strong>,</p>
    <p>Your payout has been successfully transferred to your registered bank account.</p>
    <table class="info-table">
      <tr><th>Payout Amount</th><td class="highlight">Rs.${Number(amount).toLocaleString("en-IN")}</td></tr>
      <tr><th>Status</th><td><span class="badge badge-green">Completed</span></td></tr>
      <tr><th>Expected Credit</th><td>Within 1-2 business days</td></tr>
    </table>
    <p>Please check your bank statement. If not received within 3 business days, contact vendor support.</p>
    <a class="btn" href="https://thedaminiedit.com/vendor/payments">View Payout History</a>
    <p style="font-size:13px;color:#888;">Vendor Support: vendor-support@thedaminiedit.com</p>
  `,
  );
  return sendMail(email, subject, html);
};

/**
 * Send return approved email to customer.
 * @param {string} email
 * @param {string} name
 * @param {Object} returnData - { id, order_number, type, pickup_date }
 */
const sendReturnApprovedEmail = async (email, name, returnData) => {
  const typeLabel =
    {
      return: "Return and Refund",
      replacement: "Replacement",
      exchange: "Exchange",
    }[returnData.type] || "Return";

  const subject = `Your ${typeLabel} Request is Approved - ${BRAND_NAME}`;
  const html = buildHtml(
    "Return Approved",
    `
    <h2>Return Request Approved!</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your <strong>${typeLabel}</strong> request for order <strong>#${returnData.order_number}</strong> has been approved.</p>
    <table class="info-table">
      <tr><th>Request Type</th><td><span class="badge">${typeLabel}</span></td></tr>
      <tr><th>Order Number</th><td>#${returnData.order_number}</td></tr>
      ${returnData.pickup_date ? `<tr><th>Pickup Scheduled</th><td>${new Date(returnData.pickup_date).toDateString()}</td></tr>` : ""}
    </table>
    ${
      returnData.type === "return"
        ? "<p>Once we receive and inspect the item, your <strong>refund will be processed within 5-7 business days</strong>.</p>"
        : "<p>A replacement shipment will be dispatched after we pick up the original item.</p>"
    }
    <a class="btn" href="https://thedaminiedit.com/orders">Track Return</a>
    <p style="font-size:13px;color:#888;">Please keep the item in its original packaging for pickup.</p>
  `,
  );
  return sendMail(email, subject, html);
};

/**
 * Send vendor application approved (congratulations) email.
 * @param {string} email
 * @param {string} name        - Vendor's name
 * @param {string} storeName   - Vendor's store name
 */
const sendVendorApprovedEmail = async (email, name, storeName) => {
  const subject = `Congratulations! Your ${BRAND_NAME} seller account is approved`;
  const html = buildHtml(
    "Seller Account Approved",
    `
    <h2>Congratulations, ${name}!</h2>
    <p>Great news — your seller application for <strong>${storeName}</strong> has been <span class="badge badge-green">Approved</span>.</p>
    <p>You are now an official partner on <strong>${BRAND_NAME}</strong>. Start selling in a few simple steps:</p>
    <ol style="padding-left:20px;line-height:2;color:#555;">
      <li>Log in to your seller dashboard</li>
      <li>Complete your store profile</li>
      <li>List your first product</li>
      <li>Get discovered by thousands of shoppers</li>
    </ol>
    <a class="btn" href="https://thedaminiedit.com/vendor">Go to Seller Dashboard</a>
    <table class="info-table">
      <tr><th>Store Name</th><td>${storeName}</td></tr>
      <tr><th>Status</th><td><span class="badge badge-green">Approved</span></td></tr>
    </table>
    <p style="font-size:13px;color:#888;">Questions? Our vendor support team is here to help — vendor-support@thedaminiedit.com</p>
  `,
  );
  return sendMail(email, subject, html);
};

// ─── Exports ─────────────────────────────────────────────────
module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendOrderPlacedEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendRefundInitiatedEmail,
  sendPayoutReleasedEmail,
  sendReturnApprovedEmail,
  sendVendorApprovedEmail,
};

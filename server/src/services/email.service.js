/**
 * Damini Marketplace — Email Service
 * ─────────────────────────────────────────────────────────────
 * Sends all transactional emails via SMTP using Nodemailer.
 * Transport settings come from config (mail section):
 *   - development: Gmail   (config/default.yaml + local.yaml)
 *   - production:  Hostinger (config/production.yaml)
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
  host: mailCfg.host,
  port: Number(mailCfg.port),
  secure: Boolean(mailCfg.secure), // true = SSL/TLS (port 465), false = STARTTLS (587)
  auth: {
    user: mailCfg.user,
    pass: mailCfg.password,
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
const BRAND_PRIMARY = "#9F0202";
const BRAND_ACCENT = "#F4B400";
const BRAND_NAME = "The Damini Edit";

/**
 * Build the outer HTML shell shared by every email.
 * @param {string} title   - Browser/preview title
 * @param {string} body    - Inner HTML content
 * @returns {string} Full HTML document string
 */
const buildHtml = (title, body) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>

<body style="box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;">

  <div style="box-sizing:border-box;max-width:600px;margin:30px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

    <!-- Header -->
    <div style="box-sizing:border-box;background:${BRAND_PRIMARY};padding:28px 32px;text-align:center;">
      <h1 style="box-sizing:border-box;margin:0;padding:0;color:#fff;font-size:24px;letter-spacing:1px;">
        ${BRAND_NAME}<span style="color:${BRAND_ACCENT};">.</span>
      </h1>

      <p style="box-sizing:border-box;margin:4px 0 0;padding:0;color:#fff;font-size:13px;">
        India's Fastest Growing Marketplace
      </p>
    </div>

    <!-- Body -->
    <div style="box-sizing:border-box;padding:36px 40px;">
      ${body}
    </div>

    <!-- Footer -->
    <div style="box-sizing:border-box;background:#888;padding:20px 32px;text-align:center;font-size:12px;color:#fff;">
      
      <p style="box-sizing:border-box;margin:0;padding:0;">
        &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
      </p>

      <p style="box-sizing:border-box;margin:6px 0 0;padding:0;">
        <a href="https://www.thedaminiedit.com/privacy" style="color:${BRAND_PRIMARY};text-decoration:none;">Privacy Policy</a>
        &nbsp;|&nbsp;
        <a href="https://www.thedaminiedit.com/terms" style="color:${BRAND_PRIMARY};text-decoration:none;">Terms of Service</a>
        &nbsp;|&nbsp;
        <a href="https://www.thedaminiedit.com/support" style="color:${BRAND_PRIMARY};text-decoration:none;">Help Centre</a>
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
      from: mailCfg.from || `"${BRAND_NAME}" <${mailCfg.user}>`,
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
    <h2 style="margin:0 0 18px;font-size:20px;color:${BRAND_PRIMARY};">
      Verify Your Email Address
    </h2>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Welcome to <strong>${BRAND_NAME}</strong>! Use the OTP below to verify your email address.
      This code expires in
      <span style="color:${BRAND_ACCENT};font-weight:700;">10 minutes</span>.
    </p>

    <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:${BRAND_PRIMARY};background:#FFF5F5;border:2px dashed ${BRAND_PRIMARY};border-radius:8px;text-align:center;padding:12px 0;margin:24px 0;">
      ${otp}
    </div>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      If you did not create an account with us, you can safely ignore this email.
    </p>

    <hr style="border:0;border-top:1px solid #eee;margin:24px 0;" />

    <p style="margin:0;line-height:1.7;font-size:13px;color:#888;">
      Never share this code with anyone - our team will never ask for it.
    </p>
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
    <h2 style="margin:0 0 18px;font-size:20px;color:${BRAND_PRIMARY};">
      Welcome aboard, ${name}!
    </h2>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Your email has been verified successfully. You are now part of the
      <strong>${BRAND_NAME}</strong> family.
    </p>

    <ul style="margin:0 0 14px;padding-left:20px;line-height:2;color:#555;">
      <li>Shop from thousands of verified vendors</li>
      <li>Earn wallet cashback on every order</li>
      <li>Save your favourites to your wishlist</li>
      <li>Track your orders in real time</li>
    </ul>

    <a
      href="https://thedaminiedit.com/products"
      style="display:inline-block;background:${BRAND_PRIMARY};color:#fff!important;padding:13px 32px;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;margin:20px 0;"
    >
      Start Shopping
    </a>

    <p style="margin:0 0 14px;line-height:1.7;font-size:13px;color:#888;">
      Happy shopping! ${BRAND_NAME} Team
    </p>
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
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#444;">
          ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ""}
        </td>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#444;">
          ${item.quantity}
        </td>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#444;">
          Rs.${Number(item.unit_price).toLocaleString("en-IN")}
        </td>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#444;">
          Rs.${Number(item.total_price).toLocaleString("en-IN")}
        </td>
      </tr>`,
    )
    .join("");

  const subject = `Order Confirmed #${order.order_number} - ${BRAND_NAME}`;
  const html = buildHtml(
    "Order Confirmed",
    `
    <h2 style="margin:0 0 18px;font-size:20px;color:${BRAND_PRIMARY};">
      Your Order is Confirmed!
    </h2>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Thank you for shopping with <strong>${BRAND_NAME}</strong>!
      Your order has been placed successfully.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Order Number
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          <span style="display:inline-block;background:${BRAND_PRIMARY};color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">
            #${order.order_number}
          </span>
        </td>
      </tr>

      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Payment Method
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          ${(order.payment_method || "").toUpperCase()}
        </td>
      </tr>

      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Order Total
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          <strong style="color:${BRAND_ACCENT};font-weight:700;">
            Rs.${Number(order.total).toLocaleString("en-IN")}
          </strong>
        </td>
      </tr>

      ${
        order.estimated_delivery
          ? `
      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Est. Delivery
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          ${order.estimated_delivery}
        </td>
      </tr>
      `
          : ""
      }
    </table>

    <h3 style="margin:0 0 10px;font-size:16px;color:#555;">
      Items Ordered
    </h3>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <thead>
        <tr>
          <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
            Product
          </th>
          <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
            Qty
          </th>
          <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
            Unit Price
          </th>
          <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
            Total
          </th>
        </tr>
      </thead>

      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <a
      href="https://thedaminiedit.com/orders/${order.id}"
      style="display:inline-block;background:${BRAND_PRIMARY};color:#fff!important;padding:13px 32px;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;margin:20px 0;"
    >
      Track Order
    </a>

    <p style="margin:0 0 14px;line-height:1.7;font-size:13px;color:#888;">
      You will receive an email when your order is shipped.
    </p>
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
    <h2 style="margin:0 0 18px;font-size:20px;color:${BRAND_PRIMARY};">
      Your Order Has Shipped!
    </h2>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Your order <strong>#${order.order_number}</strong> has been picked up by our delivery partner.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Order Number
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          <span style="display:inline-block;background:${BRAND_PRIMARY};color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">
            #${order.order_number}
          </span>
        </td>
      </tr>

      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Tracking ID
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          <strong>${trackingId}</strong>
        </td>
      </tr>

      <tr>
        <th style="text-align:left;padding:10px 14px;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Status
        </th>
        <td style="text-align:left;padding:10px 14px;font-size:14px;">
          <span style="display:inline-block;background:${BRAND_ACCENT};color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">
            Shipped
          </span>
        </td>
      </tr>
    </table>

    <a
      href="https://thedaminiedit.com/orders/${order.id}"
      style="display:inline-block;background:${BRAND_PRIMARY};color:#fff!important;padding:13px 32px;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;margin:20px 0;"
    >
      Live Track
    </a>

    <p style="margin:0 0 14px;line-height:1.7;font-size:13px;color:#888;">
      Delivery attempt between 9 AM - 9 PM. Please ensure someone is available.
    </p>
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
   <h2 style="margin:0 0 18px;font-size:20px;color:${BRAND_PRIMARY};">
      Your Order Has Been Delivered!
    </h2>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Your order <strong>#${order.order_number}</strong> has been successfully delivered.
      We hope you love your purchase!
    </p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Order Number
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          <span style="display:inline-block;background:${BRAND_PRIMARY};color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">
            #${order.order_number}
          </span>
        </td>
      </tr>

      <tr>
        <th style="text-align:left;padding:10px 14px;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Status
        </th>
        <td style="text-align:left;padding:10px 14px;font-size:14px;">
          <span style="display:inline-block;background:#2e7d32;color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">
            Delivered
          </span>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Share your review and help other shoppers!
    </p>

    <a
      href="https://thedaminiedit.com/orders/${order.id}/review"
      style="display:inline-block;background:${BRAND_PRIMARY};color:#fff!important;padding:13px 32px;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;margin:20px 0;"
    >
      Write a Review
    </a>

    <p style="margin:0 0 14px;line-height:1.7;font-size:13px;color:#888;">
      If you have any issue, you can raise a return request from your order details
      page within the return window.
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
    <h2 style="margin:0 0 18px;font-size:20px;color:${BRAND_PRIMARY};">
      Order Cancelled
    </h2>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Your order <strong>#${order.order_number}</strong> has been cancelled as requested.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Order Number
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          <span style="display:inline-block;background:${BRAND_PRIMARY};color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">
            #${order.order_number}
          </span>
        </td>
      </tr>

      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Cancelled Amount
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          <strong style="color:${BRAND_ACCENT};font-weight:700;">
            Rs.${Number(order.total).toLocaleString("en-IN")}
          </strong>
        </td>
      </tr>

      ${
        order.cancel_reason
          ? `
      <tr>
        <th style="text-align:left;padding:10px 14px;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Reason
        </th>
        <td style="text-align:left;padding:10px 14px;font-size:14px;color:#444;">
          ${order.cancel_reason}
        </td>
      </tr>
      `
          : ""
      }
    </table>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      If you paid online, a
      <strong>refund will be processed within 5-7 business days</strong>.
    </p>

    <a
      href="https://thedaminiedit.com/products"
      style="display:inline-block;background:${BRAND_PRIMARY};color:#fff!important;padding:13px 32px;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;margin:20px 0;"
    >
      Continue Shopping
    </a>

    <p style="margin:0 0 14px;line-height:1.7;font-size:13px;color:#888;">
      Questions? Contact support@thedaminiedit.com
    </p>
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
    <h2 style="margin:0 0 18px;font-size:20px;color:${BRAND_PRIMARY};">
      Refund Initiated
    </h2>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      We have initiated a refund for your order. Details:
    </p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      ${
        refund.order_number
          ? `
      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Order Number
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#444;">
          #${refund.order_number}
        </td>
      </tr>
      `
          : ""
      }

      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Refund Amount
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          <strong style="color:${BRAND_ACCENT};font-weight:700;">
            Rs.${Number(refund.amount).toLocaleString("en-IN")}
          </strong>
        </td>
      </tr>

      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Reason
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#444;">
          ${refund.reason}
        </td>
      </tr>

      <tr>
        <th style="text-align:left;padding:10px 14px;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Timeline
        </th>
        <td style="text-align:left;padding:10px 14px;font-size:14px;color:#444;">
          5-7 business days
        </td>
      </tr>
    </table>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      The refund will be credited to your original payment method.
    </p>

    <a
      href="https://thedaminiedit.com/orders"
      style="display:inline-block;background:${BRAND_PRIMARY};color:#fff!important;padding:13px 32px;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;margin:20px 0;"
    >
      View Orders
    </a>
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
    <h2 style="margin:0 0 18px;font-size:20px;color:${BRAND_PRIMARY};">
      Your Payout Has Been Released!
    </h2>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Hi <strong>${vendorName}</strong>,
    </p>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Your payout has been successfully transferred to your registered bank account.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Payout Amount
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          <strong style="color:${BRAND_ACCENT};font-weight:700;">
            Rs.${Number(amount).toLocaleString("en-IN")}
          </strong>
        </td>
      </tr>

      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Status
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          <span style="display:inline-block;background:#2e7d32;color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">
            Completed
          </span>
        </td>
      </tr>

      <tr>
        <th style="text-align:left;padding:10px 14px;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Expected Credit
        </th>
        <td style="text-align:left;padding:10px 14px;font-size:14px;color:#444;">
          Within 1-2 business days
        </td>
      </tr>
    </table>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Please check your bank statement. If not received within 3 business days,
      contact vendor support.
    </p>

    <a
      href="https://thedaminiedit.com/vendor/payments"
      style="display:inline-block;background:${BRAND_PRIMARY};color:#fff!important;padding:13px 32px;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;margin:20px 0;"
    >
      View Payout History
    </a>

    <p style="margin:0 0 14px;line-height:1.7;font-size:13px;color:#888;">
      Vendor Support: vendor-support@thedaminiedit.com
    </p>
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
    <h2 style="margin:0 0 18px;font-size:20px;color:${BRAND_PRIMARY};">
      Return Request Approved!
    </h2>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Your <strong>${typeLabel}</strong> request for order
      <strong>#${returnData.order_number}</strong> has been approved.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Request Type
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">
          <span style="display:inline-block;background:${BRAND_PRIMARY};color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">
            ${typeLabel}
          </span>
        </td>
      </tr>

      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Order Number
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#444;">
          #${returnData.order_number}
        </td>
      </tr>

      ${
        returnData.pickup_date
          ? `
      <tr>
        <th style="text-align:left;padding:10px 14px;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Pickup Scheduled
        </th>
        <td style="text-align:left;padding:10px 14px;font-size:14px;color:#444;">
          ${new Date(returnData.pickup_date).toDateString()}
        </td>
      </tr>
      `
          : ""
      }
    </table>

    ${
      returnData.type === "return"
        ? `
    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Once we receive and inspect the item, your
      <strong>refund will be processed within 5-7 business days</strong>.
    </p>
    `
        : `
    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      A replacement shipment will be dispatched after we pick up the original item.
    </p>
    `
    }

    <a
      href="https://thedaminiedit.com/orders"
      style="display:inline-block;background:${BRAND_PRIMARY};color:#fff!important;padding:13px 32px;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;margin:20px 0;"
    >
      Track Return
    </a>

    <p style="margin:0 0 14px;line-height:1.7;font-size:13px;color:#888;">
      Please keep the item in its original packaging for pickup.
    </p>
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
    <h2 style="margin:0 0 18px;font-size:20px;color:${BRAND_PRIMARY};">
      Congratulations, ${name}!
    </h2>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      Great news — your seller application for
      <strong>${storeName}</strong> has been
      <span style="display:inline-block;background:#2e7d32;color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">
        Approved
      </span>.
    </p>

    <p style="margin:0 0 14px;line-height:1.7;color:#444;">
      You are now an official partner on <strong>${BRAND_NAME}</strong>.
      Start selling in a few simple steps:
    </p>

    <ol style="margin:0 0 14px;padding-left:20px;line-height:2;color:#555;">
      <li>Log in to your seller dashboard</li>
      <li>Complete your store profile</li>
      <li>List your first product</li>
      <li>Get discovered by thousands of shoppers</li>
    </ol>

    <a
      href="https://vendor.thedaminiedit.com/"
      style="display:inline-block;background:${BRAND_PRIMARY};color:#fff!important;padding:13px 32px;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;margin:20px 0;"
    >
      Go to Seller Dashboard
    </a>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <th style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Store Name
        </th>
        <td style="text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#444;">
          ${storeName}
        </td>
      </tr>

      <tr>
        <th style="text-align:left;padding:10px 14px;background:#FFF5F5;color:${BRAND_PRIMARY};font-size:14px;font-weight:600;">
          Status
        </th>
        <td style="text-align:left;padding:10px 14px;font-size:14px;">
          <span style="display:inline-block;background:#2e7d32;color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">
            Approved
          </span>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 14px;line-height:1.7;font-size:13px;color:#888;">
      Questions? Our vendor support team is here to help —
      vendor-support@thedaminiedit.com
    </p>
  `,
  );
  return sendMail(email, subject, html);
};

// ─── Exports ─────────────────────────────────────────────────

/**
 * Email vendor when an ad campaign exhausts its total budget.
 * @param {string} email      - Vendor's account email
 * @param {string} name       - Recipient display name
 * @param {Object} campaign   - { name, spent, total_budget, id }
 */
const sendBudgetExhaustedEmail = async (email, name, campaign) => {
  const spent = Number(campaign.spent || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" });
  const total = Number(campaign.total_budget || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" });
  const html = buildHtml(
    `Campaign budget exhausted — ${campaign.name}`,
    `
    <p style="margin:0 0 16px;line-height:1.7;color:#444;">Hi ${name},</p>
    <p style="margin:0 0 16px;line-height:1.7;color:#444;">
      Your ad campaign <strong style="color:${BRAND_PRIMARY};">${campaign.name}</strong> has reached its total budget and has been paused automatically.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
      <tr>
        <td style="padding:10px 12px;border:1px solid #eee;font-size:13px;color:#888;">Budget spent</td>
        <td style="padding:10px 12px;border:1px solid #eee;font-size:13px;font-weight:600;color:${BRAND_PRIMARY};">${spent}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #eee;font-size:13px;color:#888;">Total budget</td>
        <td style="padding:10px 12px;border:1px solid #eee;font-size:13px;font-weight:600;color:#444;">${total}</td>
      </tr>
    </table>
    <p style="margin:0 0 16px;line-height:1.7;font-size:13px;color:#888;">
      Top up your ads wallet and resume the campaign from the Damini Ads Manager to keep driving sales.
    </p>
    <p style="margin:0;line-height:1.7;font-size:13px;color:#888;">
      This is an automated message from ${BRAND_NAME}. Please do not reply to this email.
    </p>
  `,
  );
  return sendMail(email, `Campaign budget exhausted: ${campaign.name}`, html);
};

/**
 * Email vendor when their ads wallet falls below the low-balance threshold.
 * @param {string} email   - Vendor's account email
 * @param {string} name    - Recipient display name
 * @param {number} balance - Current wallet balance (₹)
 * @param {number} threshold - Configured alert threshold (₹)
 */
const sendLowWalletBalanceEmail = async (email, name, balance, threshold) => {
  const bal = Number(balance || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" });
  const thr = Number(threshold || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" });
  const html = buildHtml(
    "Your ads wallet balance is low",
    `
    <p style="margin:0 0 16px;line-height:1.7;color:#444;">Hi ${name},</p>
    <p style="margin:0 0 16px;line-height:1.7;color:#444;">
      Your ads wallet balance is now <strong style="color:${BRAND_PRIMARY};">${bal}</strong>, below your alert threshold of <strong>${thr}</strong>.
    </p>
    <p style="margin:0 0 16px;line-height:1.7;color:#444;">
      Active campaigns will pause automatically once funds run out. Add funds to your ads wallet to keep your ads running uninterrupted.
    </p>
    <p style="margin:0;line-height:1.7;font-size:13px;color:#888;">
      This is an automated message from ${BRAND_NAME}. Please do not reply to this email.
    </p>
  `,
  );
  return sendMail(email, "Your ads wallet balance is low", html);
};

/**
 * Generic email for system/transactional notices (campaign approvals, etc).
 */
const sendGenericEmail = async (email, subject, body) => {
  const html = buildHtml(
    subject,
    `
    <p style="margin:0 0 14px;line-height:1.7;color:#444;">Hi there,</p>
    <p style="margin:0 0 14px;line-height:1.7;color:#444;">${body}</p>
    <p style="margin:0;line-height:1.7;font-size:13px;color:#888;">
      This is an automated message from ${BRAND_NAME}. Please do not reply to this email.
    </p>
  `,
  );
  return sendMail(email, subject, html);
};

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
  sendGenericEmail,
  sendBudgetExhaustedEmail,
  sendLowWalletBalanceEmail,
};

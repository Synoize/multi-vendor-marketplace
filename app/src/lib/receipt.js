import { code39Svg } from "./barcode";

function inr(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function openCustomerReceipt(order, options = {}) {
  const siteName = options.siteName || "The Damini Edit Marketplace";
  const win = window.open("", "_blank", "width=820,height=920");
  if (!win) {
    return false;
  }

  const items = order.items || [];
  const address = [
    order.line1,
    order.line2,
    order.city,
    order.state,
    order.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const itemRows = items
    .map(
      (it) => `
        <tr>
          <td>${escapeHtml(it.product_name)}${it.variant_name ? `<div class="muted">${escapeHtml(it.variant_name)}</div>` : ""}</td>
          <td class="muted">${escapeHtml(it.vendor_name || "Seller")}</td>
          <td class="num">${it.quantity}</td>
          <td class="num">${inr(it.unit_price)}</td>
          <td class="num">${inr(it.total_price)}</td>
        </tr>`,
    )
    .join("");

  const breakdown = [
    ["Subtotal", order.subtotal],
    ["Discount", -(Number(order.discount) || 0)],
    ["Coins discount", -(Number(order.coins_discount) || 0)],
    ["Delivery charges", Number(order.shipping_charges) || 0],
    ["GST", Number(order.gst_total) || 0],
  ]
    .filter(([, v]) => v)
    .map(
      ([label, v]) =>
        `<tr class="bbreak"><td>${label}</td><td class="num">${v < 0 ? `− ${inr(Math.abs(v))}` : inr(v)}</td></tr>`,
    )
    .join("");

  const barcodeSvg = code39Svg(order.order_number);

  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt #${escapeHtml(order.order_number)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; font-size: 13px; padding: 24px; }
  h1 { font-size: 18px; }
  .muted { color: #6b7280; }
  .num { text-align: right; white-space: nowrap; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #111; padding-bottom: 12px; }
  .brand { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .order-meta { text-align: right; }
  .order-meta .muted { font-size: 11px; }
  .blocks { display: flex; gap: 20px; margin: 16px 0; }
  .block { flex: 1; }
  .block h3 { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; }
  .bbreak td { border-bottom: none; }
  .total td { border-top: 2px solid #111; border-bottom: none; font-weight: 700; font-size: 15px; }
  .status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
  .status.green { background: #dcfce7; color: #166534; }
  .status.amber { background: #fef3c7; color: #92400e; }
  .status.red { background: #fee2e2; color: #b91c1c; }
  .footer { margin-top: 22px; text-align: center; }
  .barcode { margin: 8px auto 0; text-align: center; }
  .barcode svg { max-width: 100%; }
  .fine { font-size: 10px; color: #9ca3af; margin-top: 12px; text-align: center; }
  @page { margin: 12mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      <h1>Order Receipt</h1>
      <div class="brand">${escapeHtml(siteName)}</div>
    </div>
    <div class="order-meta">
      <div><strong>Order #${escapeHtml(order.order_number)}</strong></div>
      <div class="muted">${escapeHtml(formatDate(order.created_at))}</div>
    </div>
  </div>

  <div class="blocks">
    <div class="block">
      <h3>Billed To</h3>
      <div><strong>${escapeHtml(order.customer_name || order.delivery_name || "—")}</strong></div>
      <div class="muted">${escapeHtml(order.customer_email || "")}</div>
      <div class="muted">${escapeHtml(order.delivery_phone || "")}</div>
    </div>
    <div class="block">
      <h3>Deliver To</h3>
      <div><strong>${escapeHtml(order.delivery_name || "—")}</strong></div>
      <div class="muted">${escapeHtml(order.delivery_phone || "")}</div>
      <div class="muted">${escapeHtml(address)}</div>
    </div>
    <div class="block">
      <h3>Payment</h3>
      <div class="capitalize">${escapeHtml((order.payment_method || "—").replace("_", " "))}</div>
      <div class="capitalize">Status: ${escapeHtml((order.payment_status || "—").replace("_", " "))}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Item</th><th>Seller</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
    <tbody>${breakdown}
      <tr class="total"><td colspan="4">Total</td><td class="num">${inr(order.total)}</td></tr>
    </tbody>
  </table>

  <div class="footer">
    <div class="status ${order.payment_status === "paid" ? "green" : order.payment_status === "failed" || order.payment_status === "refunded" ? "red" : "amber"}">
      ${escapeHtml((order.status || "").replaceAll("_", " "))}
    </div>
    <div class="barcode">${barcodeSvg}</div>
    <div class="fine">Thank you for shopping with ${escapeHtml(siteName)}. This is a computer-generated receipt.</div>
  </div>
</body>
</html>`);

  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      // ignore - user can still print via Ctrl/Cmd+P
    }
  }, 400);
  return true;
}
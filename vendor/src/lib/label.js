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

function openPrint(title, bodyHtml) {
  const win = window.open("", "_blank", "width=820,height=920");
  if (!win) return false;
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; font-size: 13px; padding: 24px; }
  .muted { color: #6b7280; }
  .num { text-align: right; white-space: nowrap; }
  @page { margin: 12mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      // ignore
    }
  }, 400);
  return true;
}

export function openVendorReceipt(order, vendor = {}) {
  const items = order.items || [];
  const address = [order.line1, order.line2, order.city, order.state, order.pincode]
    .filter(Boolean)
    .join(", ");

  const itemRows = items
    .map(
      (it) => `
        <tr>
          <td>${escapeHtml(it.product_name)}${it.variant_name ? `<div class="muted">${escapeHtml(it.variant_name)}</div>` : ""}</td>
          <td class="num">${it.quantity}</td>
          <td class="num">${inr(it.unit_price)}</td>
          <td class="num">${inr(it.total_price)}</td>
        </tr>`,
    )
    .join("");

  const barcodeSvg = code39Svg(order.order_number);

  return openPrint(
    `Receipt #${order.order_number}`,
    `
  <div class="head">
    <div>
      <h1>Seller Receipt</h1>
      <div class="brand">${escapeHtml(vendor.store_name || vendor.business_name || "Seller")}</div>
    </div>
    <div class="order-meta">
      <div><strong>Order #${escapeHtml(order.order_number)}</strong></div>
      <div class="muted">${escapeHtml(formatDate(order.created_at))}</div>
    </div>
  </div>

  <div class="blocks">
    <div class="block">
      <h3>Customer</h3>
      <div><strong>${escapeHtml(order.delivery_name || "—")}</strong></div>
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
      <tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
    <tbody>
      <tr class="total"><td colspan="3">Item Total (your part)</td><td class="num">${inr(order.vendor_total)}</td></tr>
      <tr class="bbreak"><td colspan="3">Order total</td><td class="num">${inr(order.total)}</td></tr>
    </tbody>
  </table>

  <div class="footer">
    <h2 class="label-title">Seller Receipt</h2>
    <div class="barcode">${barcodeSvg}</div>
  </div>
  <style>
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #111; padding-bottom: 12px; }
    .head h1 { font-size: 18px; }
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
    .capitalize { text-transform: capitalize; }
    .footer { margin-top: 26px; text-align: center; }
    .footer .label-title { font-size: 12px; text-transform: uppercase; letter-spacing: .12em; color: #6b7280; }
    .barcode { margin: 10px auto 0; }
    .barcode svg { max-width: 100%; }
  </style>`,
  );
}

export function openProductBarcodeSticker(product) {
  const code = product.barcode || product.sku || "";
  const barcodeSvg = code39Svg(code || product.id, { height: 80, fontSize: 18 });
  const statusLine = [
    product.status ? String(product.status).replaceAll("_", " ") : null,
    product.stock != null ? `Stock: ${product.stock}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return openPrint(
    `Product Barcode ${product.name ? `- ${product.name}` : ""}`,
    `
  <div class="sticker">
    <div class="brand">The Damini Edit Marketplace</div>
    <div class="name">${escapeHtml(product.name || "")}</div>
    <div class="muted">SKU: ${escapeHtml(product.sku || "—")}${code ? ` · Barcode: ${escapeHtml(code)}` : ""}</div>
    ${product.price != null ? `<div class="price">${inr(product.price)}</div>` : ""}
    <div class="barcode">${barcodeSvg}</div>
    ${statusLine ? `<div class="muted">${escapeHtml(statusLine)}</div>` : ""}
  </div>
  <style>
    .sticker { text-align: center; padding: 16px; border: 1px dashed #d1d5db; border-radius: 10px; max-width: 420px; margin: 0 auto; }
    .brand { display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: #374151; font-weight: 700; border-bottom: 2px solid #111; padding-bottom: 3px; margin-bottom: 10px; }
    .name { font-size: 16px; font-weight: 700; margin: 4px 0 2px; word-break: break-word; }
    .muted { color: #6b7280; font-size: 11px; margin-top: 2px; }
    .price { font-size: 18px; font-weight: 800; margin-top: 6px; }
    .barcode { margin: 12px auto 4px; }
    .barcode svg { display: block; margin: 0 auto; max-width: 100%; }
  </style>`,
  );
}

export function openPackingLabel(order, vendor = {}) {
  const items = order.items || [];
  const toAddress = [order.line1, order.line2, order.city, order.state, order.pincode]
    .filter(Boolean)
    .join(", ");

  const fromAddress = [
    vendor.pickup_line1,
    vendor.pickup_line2,
    vendor.pickup_city,
    vendor.pickup_state,
    vendor.pickup_pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const totalWeightG = items.reduce(
    (sum, it) => sum + (parseFloat(it.weight_g) || 0) * (it.quantity || 1),
    0,
  );
  const weightText =
    totalWeightG >= 1000
      ? `${(totalWeightG / 1000).toFixed(2)} kg`
      : totalWeightG > 0
        ? `${Math.round(totalWeightG)} g`
        : "—";

  const barcodeSvg = code39Svg(order.order_number, { height: 60, fontSize: 16 });

  const packingRows = items
    .map(
      (it) => `
        <tr>
          <td>${escapeHtml(it.product_name)}${it.variant_name ? `<div class="muted">${escapeHtml(it.variant_name)}</div>` : ""}</td>
          <td class="num">× ${it.quantity}</td>
          <td class="num">${it.weight_g != null ? (parseFloat(it.weight_g) >= 1000 ? `${(parseFloat(it.weight_g) / 1000).toFixed(2)} kg` : `${parseFloat(it.weight_g)} g`) : "—"}</td>
        </tr>`,
    )
    .join("");

  return openPrint(
    `Packing Label #${order.order_number}`,
    `
  <div class="label">
    <div class="label-head">
      <div>
        <div class="brand">The Damini Edit Marketplace</div>
        <div class="order">Order #${escapeHtml(order.order_number)}</div>
        <div class="muted">${escapeHtml(formatDate(order.created_at))}</div>
      </div>
      <div class="barcode">${barcodeSvg}</div>
    </div>

    <div class="addresses">
      <div class="addr">
        <h3>From</h3>
        <div><strong>${escapeHtml(vendor.store_name || vendor.business_name || "Seller")}</strong></div>
        <div>${escapeHtml(vendor.pickup_name || "")}</div>
        <div class="muted">${escapeHtml(vendor.pickup_phone || "")}</div>
        <div>${escapeHtml(fromAddress || "Pickup address not set")}</div>
      </div>
      <div class="addr">
        <h3>To</h3>
        <div><strong>${escapeHtml(order.delivery_name || "—")}</strong></div>
        <div class="muted">${escapeHtml(order.delivery_phone || "")}</div>
        <div>${escapeHtml(toAddress)}</div>
      </div>
    </div>

    <div class="facts">
      <span><strong>Items:</strong> ${items.length}</span>
      <span><strong>Weight:</strong> ${escapeHtml(weightText)}</span>
      <span><strong>Payment:</strong> ${escapeHtml((order.payment_method || "—").replace("_", " "))} · ${escapeHtml((order.payment_status || "—").replace("_", " "))}</span>
      ${order.shipment?.awb_code ? `<span><strong>AWB:</strong> ${escapeHtml(order.shipment.awb_code)}</span><span><strong>Courier:</strong> ${escapeHtml(order.shipment.courier_name || "—")}</span>` : ""}
    </div>

    <h3 class="list-title">Packing List</h3>
    <table>
      <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Wt/unit</th></tr></thead>
      <tbody>${packingRows}</tbody>
    </table>
  </div>
  <style>
    .label { font-size: 12px; }
    .label-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 3px solid #111; padding-bottom: 10px; }
    .brand { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #374151; font-weight: 700; }
    .order { font-size: 22px; font-weight: 800; margin-top: 2px; }
    .muted { color: #6b7280; }
    .barcode { text-align: right; }
    .barcode svg { display: block; max-width: 340px; }
    .addresses { display: flex; gap: 16px; margin: 16px 0; }
    .addr { flex: 1; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; min-height: 96px; }
    .addr h3 { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #6b7280; margin-bottom: 4px; }
    .facts { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 12px 0 4px; }
    .list-title { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #6b7280; margin: 12px 0 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
    th { font-size: 10px; text-transform: uppercase; color: #6b7280; }
    .num { text-align: right; white-space: nowrap; }
  </style>`,
  );
}
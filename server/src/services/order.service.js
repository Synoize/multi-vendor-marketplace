/**
 * Damini Marketplace - Order Service
 */

const { query, queryRows, queryOne, transaction } = require('../database/connection');
const { getPagination } = require('../utils/pagination.util');
const { generateOrderNumber } = require('../utils/sku.util');
const { getShippingConfig } = require('../utils/shipping.util');
const emailService = require('./email.service');
const notificationService = require('./notification.service');
const config = require('config');

// In-memory checkout locks to prevent duplicate submissions
const checkoutLocks = new Map();

async function acquireCheckoutLock(userId) {
  if (checkoutLocks.has(userId)) {
    throw Object.assign(new Error('An order is already being processed. Please wait.'), { statusCode: 409 });
  }
  checkoutLocks.set(userId, true);
}

function releaseCheckoutLock(userId) {
  checkoutLocks.delete(userId);
}

/**
 * Validate checkout & compute order totals (no DB writes).
 * Used by createOrder and by the payment flow to size the Razorpay order.
 */
const computeCheckout = async (userId, { addressId, items, couponCode, offerId, paymentMethod }) => {
  // Validate address
  const address = await queryOne('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
  if (!address) throw Object.assign(new Error('Delivery address not found'), { statusCode: 400 });

  // Validate items & calculate totals
  let subtotal = 0;
  const validatedItems = [];
  for (const item of items) {
    const product = await queryOne(
      `SELECT p.*, v.id as vid, v.commission_rate, v.store_name, v.user_id as vendor_user_id
       FROM products p JOIN vendors v ON p.vendor_id = v.id
       WHERE p.id = ? AND p.deleted_at IS NULL`,
      [item.productId]
    );
    if (!product || product.status !== 'active') {
      throw Object.assign(new Error(`Product ${item.productName} is unavailable`), { statusCode: 400 });
    }

    let price = product.price;
    let variantName = null;
    if (item.variantId) {
      const variant = await queryOne(
        `SELECT * FROM product_variants WHERE id = ? AND product_id = ?`,
        [item.variantId, item.productId]
      );
      if (!variant || !variant.is_active) {
        throw Object.assign(new Error(`Variant for ${item.productName} is unavailable`), { statusCode: 400 });
      }
      if (variant.stock < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for ${item.productName}`), { statusCode: 400 });
      }
      price = variant.price;
      variantName = Object.entries(JSON.parse(variant.attributes))
        .map(([k, v]) => `${k}: ${v}`).join(', ');
    } else {
      if (product.stock < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for ${item.productName}`), { statusCode: 400 });
      }
    }

    const itemTotal = price * item.quantity;
    subtotal += itemTotal;

    const commRate = parseFloat(product.commission_rate || 0.1);
    const commAmount = itemTotal * commRate;
    const vendorPayout = itemTotal - commAmount;

    validatedItems.push({
      productId: item.productId,
      vendorId: product.vendor_id,
      vendorUserId: product.vendor_user_id,
      variantId: item.variantId || null,
      productName: product.name,
      productImage: item.productImage || null,
      variantName,
      quantity: item.quantity,
      unitPrice: price,
      totalPrice: itemTotal,
      commissionRate: commRate,
      commissionAmount: commAmount,
      vendorPayout,
      returnType: product.return_type || 'none',
      returnWindow: product.return_window || 0
    });
  }

  // Apply coupon
  let discount = 0;
  let couponId = null;
  if (couponCode) {
    const coupon = await queryOne(
      `SELECT * FROM coupons WHERE code = ? AND is_active = 1 
       AND valid_from <= NOW() AND valid_to >= NOW() AND is_active = 1`,
      [couponCode]
    );
    if (coupon) {
      if (subtotal >= parseFloat(coupon.min_order_amount || 0)) {
        if (!coupon.max_uses || coupon.used_count < coupon.max_uses) {
          const [usages] = await query(
            'SELECT COUNT(*) as count FROM coupon_usages WHERE coupon_id = ? AND user_id = ?',
            [coupon.id, userId]
          );
          if (usages[0].count < (coupon.max_uses_per_user || 1)) {
            if (coupon.type === 'fixed') {
              discount = parseFloat(coupon.discount_value);
            } else if (coupon.type === 'percentage') {
              discount = subtotal * (parseFloat(coupon.discount_value) / 100);
              if (coupon.max_discount) {
                discount = Math.min(discount, parseFloat(coupon.max_discount));
              }
            }
            discount = parseFloat(discount.toFixed(2));
            couponId = coupon.id;
          }
        }
      }
    }
  }

  // Apply offer
  let offerDiscount = 0;
  let offerIdApplied = null;
  if (offerId) {
    try {
      const offerService = require('./offer.service');
      const cartItemsForOffer = validatedItems.map(i => ({
        product_id: i.productId,
        variant_id: i.variantId,
        unit_price: i.unitPrice,
        price: i.unitPrice,
        quantity: i.quantity
      }));
      const result = await offerService.applyOffer(offerId, userId, cartItemsForOffer, subtotal);
      offerDiscount = result.discount;
      offerIdApplied = offerId;
    } catch (err) {
      // Offer validation failed, skip but don't block order
      console.warn('Offer validation failed:', err.message);
    }
  }

  // Apply online payment offer (e.g. ONLINE_PAY_OFF) when paying via gateway
  let onlinePayOff = 0;
  if (paymentMethod === 'razorpay') {
    const paySetting = await queryOne(
      "SELECT `value` FROM platform_settings WHERE `key` = 'online_pay_off'"
    );
    if (paySetting && parseFloat(paySetting.value) > 0) {
      onlinePayOff = Math.min(parseFloat(paySetting.value), subtotal);
    }
  }

  const totalDiscount = discount + offerDiscount + onlinePayOff;

  const { shippingCharge, freeShippingThreshold } = await getShippingConfig();
  const shippingCharges = subtotal >= freeShippingThreshold ? 0 : shippingCharge;
  const total = subtotal - totalDiscount + shippingCharges;

  return { address, validatedItems, subtotal, discount, offerDiscount, onlinePayOff, totalDiscount, shippingCharges, total, couponId, offerIdApplied };
};

/**
 * Create order from checkout
 */
const createOrder = async (userId, { addressId, items, couponCode, offerId, paymentMethod, notes }) => {
  await acquireCheckoutLock(userId);
  try {
    const { address, validatedItems, subtotal, discount, offerDiscount, totalDiscount, shippingCharges, total, couponId, offerIdApplied } = await computeCheckout(userId, { addressId, items, couponCode, offerId, paymentMethod });

    const orderNumber = generateOrderNumber();
    const cancelDeadline = new Date(Date.now() + 15 * 60 * 1000);

    let orderId;
    await transaction(async (conn) => {
      // Create order
      const [orderResult] = await conn.execute(
        `INSERT INTO orders (order_number, user_id, address_id, coupon_id, subtotal, discount, shipping_charges, total, payment_method, cancel_deadline, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderNumber, userId, addressId, couponId, subtotal, totalDiscount, shippingCharges, total, paymentMethod || 'cod', cancelDeadline, notes || null]
      );

      // Get order id
      const [ord] = await conn.execute('SELECT id FROM orders WHERE order_number = ?', [orderNumber]);
      orderId = ord[0].id;

      // Create order items & deduct stock
      for (const item of validatedItems) {
        await conn.execute(
          `INSERT INTO order_items (order_id, product_id, vendor_id, variant_id, product_name, product_image,
            variant_name, quantity, unit_price, total_price, commission_rate, commission_amount, vendor_payout, return_type, return_window)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.vendorId, item.variantId, item.productName, item.productImage,
            item.variantName, item.quantity, item.unitPrice, item.totalPrice,
            item.commissionRate, item.commissionAmount, item.vendorPayout, item.returnType, item.returnWindow]
        );

        // Deduct stock
        if (item.variantId) {
          await conn.execute('UPDATE product_variants SET stock = stock - ? WHERE id = ?', [item.quantity, item.variantId]);
        } else {
          await conn.execute('UPDATE products SET stock = stock - ?, sale_count = sale_count + ? WHERE id = ?', [item.quantity, item.quantity, item.productId]);
        }
      }

      // Mark coupon used
      if (couponId) {
        await conn.execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [couponId]);
        await conn.execute(
          'INSERT INTO coupon_usages (coupon_id, user_id, order_id, discount) VALUES (?, ?, ?, ?)',
          [couponId, userId, orderId, discount]
        );
      }

      // Mark offer used
      if (offerIdApplied) {
        const offerService = require('./offer.service');
        await offerService.recordUsage(offerIdApplied, userId, orderId, offerDiscount, conn);
      }

      // COD: mark payment as pending COD within the same transaction
      if (paymentMethod === 'cod') {
        await conn.execute("UPDATE orders SET payment_status = 'pending', status = 'confirmed' WHERE id = ?", [orderId]);
      }

      // Clear cart
      await conn.execute('DELETE FROM carts WHERE user_id = ? AND saved_for_later = 0', [userId]);
    });

    // Fire-and-forget confirmation emails & notifications so the HTTP
    // response is not delayed by SMTP (order is already committed).
    sendOrderNotifications(userId, address, orderId, orderNumber, total, paymentMethod, validatedItems)
      .catch(() => {});

    return { orderId, orderNumber, total };
  } finally {
    releaseCheckoutLock(userId);
  }
};

/**
 * Send confirmation emails & notifications for a placed order.
 * Runs in the background (fire-and-forget); failures are swallowed.
 */
async function sendOrderNotifications(userId, address, orderId, orderNumber, total, paymentMethod, validatedItems) {
  const user = await queryOne('SELECT name, email FROM users WHERE id = ?', [userId]);
  const orderForMail = {
    id: orderId,
    order_number: orderNumber,
    total,
    payment_method: paymentMethod,
    items: validatedItems.map(i => ({
      product_name: i.productName,
      variant_name: i.variantName,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      total_price: i.totalPrice,
    })),
  };
  try {
    await emailService.sendOrderPlacedEmail(user.email, user.name, orderForMail);
  } catch (e) {}
  if (address.email) {
    try {
      await emailService.sendOrderPlacedEmail(address.email, user.name, orderForMail);
    } catch (e) {}
  }
  try {
    await notificationService.createNotification(userId, {
      title: 'Order Placed!',
      message: `Your order #${orderNumber} has been placed successfully.`,
      type: 'order',
      referenceId: orderId,
      referenceType: 'order',
    });
  } catch (e) {}

  const vendorIds = [...new Set(validatedItems.map(i => i.vendorId))];
  for (const vid of vendorIds) {
    const vendorItems = validatedItems.filter(i => i.vendorId === vid);
    const vendorUserId = vendorItems[0]?.vendorUserId;
    if (!vendorUserId) continue;
    try {
      await notificationService.createNotification(vendorUserId, {
        title: 'New Order Received!',
        message: `New order #${orderNumber} for ${vendorItems.length} item(s) — ₹${vendorItems.reduce((s, i) => s + i.totalPrice, 0).toFixed(2)}. Confirm it in your Orders page.`,
        type: 'order',
        referenceId: orderId,
        referenceType: 'order',
      });
    } catch (e) {}
  }
}

/**
 * Get single order (ownership checked)
 */
const getOrder = async (orderId, userId, role = 'customer') => {
  let where = 'o.id = ?';
  const params = [orderId];
  if (role === 'customer') { where += ' AND o.user_id = ?'; params.push(userId); }

  const order = await queryOne(
    `SELECT o.*, a.name as delivery_name, a.phone as delivery_phone, a.line1, a.line2, a.city, a.state, a.pincode,
      u.name as customer_name, u.email as customer_email
     FROM orders o JOIN addresses a ON o.address_id = a.id JOIN users u ON o.user_id = u.id
     WHERE ${where}`,
    params
  );
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

  const items = await queryRows(
    `SELECT oi.*, 
      (SELECT url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1) as product_image,
      v.store_name as vendor_name
     FROM order_items oi LEFT JOIN vendors v ON oi.vendor_id = v.id
     WHERE oi.order_id = ?`,
    [orderId]
  );

  const payment = await queryOne('SELECT * FROM payments WHERE order_id = ?', [orderId]);
  const shipment = await queryOne('SELECT * FROM shipments WHERE order_id = ?', [orderId]);

  return { ...order, items, payment, shipment };
};

/**
 * Get user's orders (paginated)
 */
const getUserOrders = async (userId, filters = {}) => {
  const { page = 1, limit = 10, status } = filters;
  const { offset } = getPagination({ page, limit });
  const conditions = ['o.user_id = ?'];
  const params = [userId];
  if (status && status !== 'all') { conditions.push('o.status = ?'); params.push(status); }
  const where = conditions.join(' AND ');

  const orders = await queryRows(
    `SELECT o.id, o.order_number, o.status, o.payment_status, o.total, o.created_at, o.cancel_deadline,
      COUNT(oi.id) as item_count,
      GROUP_CONCAT(oi.product_name SEPARATOR ', ') as product_names,
      GROUP_CONCAT(DISTINCT (SELECT url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1)) as product_images
     FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE ${where} GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await query(`SELECT COUNT(*) as total FROM orders o WHERE ${where}`, params);
  return { orders, total, page, limit };
};

/**
 * Cancel order (within 15-minute window)
 */
const cancelOrder = async (orderId, userId, reason) => {
  const order = await queryOne(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [orderId, userId]
  );
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  if (!['placed', 'confirmed'].includes(order.status)) {
    throw Object.assign(new Error('Order cannot be cancelled at this stage'), { statusCode: 400 });
  }
  if (order.cancel_deadline && new Date() > new Date(order.cancel_deadline)) {
    throw Object.assign(new Error('Cancellation window has expired (15 minutes)'), { statusCode: 400 });
  }

  await transaction(async (conn) => {
    await conn.execute(
      "UPDATE orders SET status = 'cancelled', cancel_reason = ?, cancelled_at = NOW() WHERE id = ?",
      [reason || 'Cancelled by customer', orderId]
    );
    await conn.execute("UPDATE order_items SET status = 'cancelled' WHERE order_id = ?", [orderId]);

    // Restore stock
    const items = await queryRows('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    for (const item of items) {
      if (item.variant_id) {
        await conn.execute('UPDATE product_variants SET stock = stock + ? WHERE id = ?', [item.quantity, item.variant_id]);
      } else {
        await conn.execute('UPDATE products SET stock = stock + ?, sale_count = GREATEST(0, sale_count - ?) WHERE id = ?', [item.quantity, item.quantity, item.product_id]);
      }
    }
  });

  // Trigger refund if paid
  if (order.payment_status === 'paid') {
    const payment = await queryOne('SELECT id FROM payments WHERE order_id = ?', [orderId]);
    if (payment) {
      await query(
        'INSERT INTO refunds (order_id, payment_id, user_id, amount, reason, status) VALUES (?, ?, ?, ?, ?, "pending")',
        [orderId, payment.id, userId, order.total, 'Order cancelled by customer']
      );
    }
  }
};

/**
 * Admin: get all orders
 */
const getAllOrders = async (filters = {}) => {
  const { page = 1, limit = 20, status, payment_status, vendor_id, date_from, date_to, search } = filters;
  const { offset } = getPagination({ page, limit });
  const conditions = [];
  const params = [];

  if (status) { conditions.push('o.status = ?'); params.push(status); }
  if (payment_status) { conditions.push('o.payment_status = ?'); params.push(payment_status); }
  if (date_from) { conditions.push('o.created_at >= ?'); params.push(date_from); }
  if (date_to) { conditions.push('o.created_at <= ?'); params.push(date_to); }
  if (search) { conditions.push('(o.order_number LIKE ? OR u.email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const orders = await queryRows(
    `SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method, o.total, o.created_at,
      u.name as customer_name, u.email as customer_email
     FROM orders o JOIN users u ON o.user_id = u.id
     ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await query(
    `SELECT COUNT(*) as total FROM orders o JOIN users u ON o.user_id = u.id ${where}`, params
  );
  return { orders, total, page, limit };
};

/**
 * Admin: update order status
 */
const updateOrderStatus = async (orderId, status) => {
  const validStatuses = ['placed','confirmed','processing','shipped','out_for_delivery','delivered','cancelled'];
  if (!validStatuses.includes(status)) throw Object.assign(new Error('Invalid status'), { statusCode: 400 });
  const updates = ['status = ?'];
  const params = [status];
  if (status === 'delivered') { updates.push('delivered_at = NOW()'); }
  params.push(orderId);
  await query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params);
};

/**
 * Get vendor's orders
 */
const getVendorOrders = async (vendorId, filters = {}) => {
  const { page = 1, limit = 20, status } = filters;
  const { offset } = getPagination({ page, limit });
  const conditions = ['oi.vendor_id = ?'];
  const params = [vendorId];
  if (status) { conditions.push('oi.status = ?'); params.push(status); }
  const where = conditions.join(' AND ');

  const items = await queryRows(
    `SELECT oi.*, o.order_number, o.created_at as order_date, o.payment_status, o.notes,
      u.name as customer_name, u.phone as customer_phone,
      a.city, a.state, a.pincode
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN users u ON o.user_id = u.id
     JOIN addresses a ON o.address_id = a.id
     WHERE ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await query(
    `SELECT COUNT(*) as total FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE ${where}`, params
  );
  return { orders: items, total, page, limit };
};

/**
 * Get order stats for admin dashboard
 */
const getOrderStats = async () => {
  const stats = await queryOne(
    `SELECT 
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN status IN ('placed','confirmed','processing') THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) as total_revenue,
      SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_orders,
      SUM(CASE WHEN DATE(created_at) = CURDATE() AND payment_status = 'paid' THEN total ELSE 0 END) as today_revenue
     FROM orders`
  );
  return stats;
};

module.exports = {
  createOrder, getOrder, getUserOrders, cancelOrder, getAllOrders,
  updateOrderStatus, getVendorOrders, getOrderStats,
  computeCheckout,
};

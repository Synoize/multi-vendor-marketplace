const { query, queryRows, queryOne } = require('../database/connection');

const getOffers = async (params = {}) => {
  const { page = 1, limit = 20, status, type, search } = params;
  const offset = (page - 1) * limit;
  const conditions = [];
  const binds = [];

  if (status === 'active') conditions.push('o.is_active = 1 AND o.valid_from <= NOW() AND o.valid_to >= NOW()');
  else if (status === 'inactive') conditions.push('(o.is_active = 0 OR o.valid_from > NOW() OR o.valid_to < NOW())');
  if (type) { conditions.push('o.type = ?'); binds.push(type); }
  if (search) { conditions.push('o.title LIKE ?'); binds.push(`%${search}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await queryRows(
    `SELECT o.* FROM offers o ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...binds, +limit, +offset]
  );
  const [[{ total }]] = await query(`SELECT COUNT(*) as total FROM offers o ${where}`, binds);
  return { items: rows, total, page: +page, limit: +limit };
};

const createOffer = async (data) => {
  await query(
    `INSERT INTO offers (title, description, type, discount_value, discount_percent, buy_quantity, get_quantity,
      max_discount, min_purchase_amount, min_item_quantity, applicable_to, applicable_id,
      valid_from, valid_to, usage_limit, per_user_limit, image, badge_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title, data.description || null, data.type,
      data.discount_value || null, data.discount_percent || null,
      data.buy_quantity || null, data.get_quantity || null,
      data.max_discount || null, data.min_purchase_amount || null,
      data.min_item_quantity || null, data.applicable_to || 'all',
      data.applicable_id || null,
      data.valid_from, data.valid_to,
      data.usage_limit || null, data.per_user_limit || 1,
      data.image || null, data.badge_text || null
    ]
  );
};

const updateOffer = async (id, data) => {
  const fields = [];
  const binds = [];
  for (const key of ['title', 'description', 'type', 'discount_value', 'discount_percent',
    'buy_quantity', 'get_quantity', 'max_discount', 'min_purchase_amount', 'min_item_quantity',
    'applicable_to', 'applicable_id', 'valid_from', 'valid_to', 'usage_limit',
    'per_user_limit', 'image', 'badge_text', 'is_active']) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      binds.push(data[key]);
    }
  }
  if (fields.length === 0) return;
  binds.push(id);
  await query(`UPDATE offers SET ${fields.join(', ')} WHERE id = ?`, binds);
};

const deleteOffer = async (id) => {
  await query('DELETE FROM offers WHERE id = ?', [id]);
};

const toggleOffer = async (id) => {
  const offer = await queryOne('SELECT is_active FROM offers WHERE id = ?', [id]);
  if (!offer) throw Object.assign(new Error('Offer not found'), { statusCode: 404 });
  await query('UPDATE offers SET is_active = ? WHERE id = ?', [offer.is_active ? 0 : 1, id]);
};

const getActiveOffers = async () => {
  return await queryRows(
    `SELECT * FROM offers WHERE is_active = 1 AND valid_from <= NOW() AND valid_to >= NOW() ORDER BY created_at DESC LIMIT 50`
  );
};

const validateOffer = async (offerId, cartItems, cartTotal) => {
  const offer = await queryOne(
    'SELECT * FROM offers WHERE id = ? AND is_active = 1 AND valid_from <= NOW() AND valid_to >= NOW()',
    [offerId]
  );
  if (!offer) throw Object.assign(new Error('Offer not found or expired'), { statusCode: 400 });

  const itemCount = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);

  if (offer.min_purchase_amount && cartTotal < parseFloat(offer.min_purchase_amount)) {
    throw Object.assign(new Error(`Minimum purchase of ₹${offer.min_purchase_amount} required`), { statusCode: 400 });
  }
  if (offer.min_item_quantity && itemCount < offer.min_item_quantity) {
    throw Object.assign(new Error(`Minimum ${offer.min_item_quantity} item(s) required`), { statusCode: 400 });
  }

  let discount = 0;

  if (offer.type === 'bogo') {
    const buyQ = parseInt(offer.buy_quantity) || 1;
    const getQ = parseInt(offer.get_quantity) || 1;
    const minItems = buyQ + getQ;
    const groups = {};
    for (const item of cartItems) {
      const key = item.product_id || item.variant_id || `_${Math.random()}`;
      if (!groups[key]) groups[key] = { ...item, quantity: 0 };
      groups[key].quantity += parseInt(item.quantity) || 1;
    }
    const eligible = Object.values(groups).filter(g => g.quantity >= minItems);
    if (!eligible.length) {
      throw Object.assign(new Error(`Add at least ${minItems} of the same product to avail this offer`), { statusCode: 400 });
    }
    eligible.sort((a, b) => (a.unit_price || a.price || 0) - (b.unit_price || b.price || 0));
    const pct = parseFloat(offer.discount_percent || 100);
    discount = parseFloat(eligible[0].unit_price || eligible[0].price || 0) * getQ * (pct / 100);
  } else if (offer.type === 'percentage') {
    discount = cartTotal * (parseFloat(offer.discount_value) / 100);
    if (offer.max_discount) discount = Math.min(discount, parseFloat(offer.max_discount));
  } else if (offer.type === 'fixed') {
    discount = Math.min(parseFloat(offer.discount_value), cartTotal);
  } else if (offer.type === 'free_shipping') {
    discount = parseFloat(offer.discount_value || 40);
  }

  discount = parseFloat(discount.toFixed(2));
  return { offer, discount };
};

const applyOffer = async (offerId, userId, cartItems, cartTotal) => {
  const check = await validateOffer(offerId, cartItems, cartTotal);

  const [[{ used }]] = await query('SELECT COUNT(*) as used FROM offer_usages WHERE offer_id = ? AND user_id = ?', [offerId, userId]);
  if (check.offer.per_user_limit && used >= check.offer.per_user_limit) {
    throw Object.assign(new Error('You have already used this offer'), { statusCode: 400 });
  }
  if (check.offer.usage_limit && check.offer.used_count >= check.offer.usage_limit) {
    throw Object.assign(new Error('This offer has reached its usage limit'), { statusCode: 400 });
  }

  return check;
};

const recordUsage = async (offerId, userId, orderId, discount, conn = null) => {
  const run = (sql, params) => (conn ? conn.execute(sql, params) : query(sql, params));
  await run('INSERT INTO offer_usages (offer_id, user_id, order_id, discount) VALUES (?, ?, ?, ?)',
    [offerId, userId, orderId, discount]);
  await run('UPDATE offers SET used_count = used_count + 1 WHERE id = ?', [offerId]);
};

module.exports = {
  getOffers, createOffer, updateOffer, deleteOffer, toggleOffer,
  getActiveOffers, validateOffer, applyOffer, recordUsage,
};

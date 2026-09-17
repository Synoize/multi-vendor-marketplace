/**
 * Variant group ↔ flat row conversion utilities.
 *
 * Group structure (the new form model):
 * {
 *   variant: { key: "Color", value: "Red", image: "..." },
 *   attributes: [
 *     { key: "Size", value: "M", mrp: 1299, price: 899, stock: 20 },
 *     { key: "Size", value: "S", mrp: 1199, price: 799, stock: 20 },
 *     { key: "Material", value: "Cotton", mrp: 1399, price: 799, stock: 20 }
 *   ],
 *   mrp: 1499, price: 999, stock: 20
 * }
 *
 * Flat row (DB / API shape):
 * { name, attributes: { Color: "Red", Size: "M" }, price, mrp, stock, image }
 */

export const VARIANT_KEYS = [
  'Color',
  'Size',
  'Material',
  'Style',
  'Weight',
  'Type',
  'Finish',
  'Pattern',
];

export const EMPTY_GROUP = {
  variant: { key: '', value: '', image: null },
  attributes: [],
  mrp: '',
  price: '',
  stock: 0,
};

export const EMPTY_ATTR = { key: '', value: '', mrp: '', price: '', stock: 0 };

/** Convert a variant group to flat product_variants rows. */
export function flattenGroup(group) {
  const { variant, attributes = [], mrp, price, stock } = group;
  if (!variant?.key || !variant?.value) return [];

  const baseAttrs = { [variant.key]: variant.value };
  const rows = [];
  const sharedImage = variant.image || null;

  const hasDefaultPricing =
    (price !== '' && price != null) || (mrp !== '' && mrp != null) || Number(stock) > 0;
  const baseRow = {
    name: variant.value,
    attributes: { ...baseAttrs },
    price: price !== '' && price != null ? Number(price) : 0,
    mrp: mrp !== '' && mrp != null ? Number(mrp) : 0,
    stock: stock != null ? Number(stock) : 0,
    image: sharedImage,
  };

  if (!attributes.length) {
    rows.push(baseRow);
    return rows;
  }

  const hasAnyAttr = attributes.some((a) => a.key && a.value);
  if (!hasAnyAttr) {
    rows.push(baseRow);
    return rows;
  }

  if (hasDefaultPricing) {
    rows.push(baseRow);
  }

  for (const attr of attributes) {
    if (!attr.key || !attr.value) continue;
    rows.push({
      name: `${variant.value} / ${attr.key}: ${attr.value}`,
      attributes: { ...baseAttrs, [attr.key]: attr.value },
      price: attr.price !== '' && attr.price != null ? Number(attr.price) : 0,
      mrp: attr.mrp !== '' && attr.mrp != null ? Number(attr.mrp) : 0,
      stock: attr.stock != null ? Number(attr.stock) : 0,
      image: sharedImage,
    });
  }

  return rows;
}

/** Convert flat product_variants rows back into groups. */
export function regroupVariants(flatVariants) {
  if (!flatVariants?.length) return [];

  const keyCounts = {};
  for (const v of flatVariants) {
    const attrs =
      typeof v.attributes === 'string' ? (() => { try { return JSON.parse(v.attributes); } catch { return {}; } })() : (v.attributes || {});
    for (const key of Object.keys(attrs)) {
      keyCounts[key] = (keyCounts[key] || 0) + 1;
    }
  }

  const total = flatVariants.length;
  let primaryKey =
    Object.keys(keyCounts).find((k) => keyCounts[k] === total) ||
    Object.entries(keyCounts).sort((a, b) => b[1] - a[1])?.[0]?.[0];

  if (!primaryKey) return [];

  const groups = new Map();
  for (const v of flatVariants) {
    const attrs =
      typeof v.attributes === 'string' ? (() => { try { return JSON.parse(v.attributes); } catch { return {}; } })() : (v.attributes || {});
    const pv = attrs[primaryKey];
    if (pv === undefined) continue;
    const gk = String(pv);
    if (!groups.has(gk)) groups.set(gk, { base: null, subs: [] });
    const g = groups.get(gk);
    const otherKeys = Object.keys(attrs).filter((k) => k !== primaryKey);
    if (otherKeys.length === 0) {
      g.base = v;
    } else {
      g.subs.push(v);
    }
  }

  return Array.from(groups.entries()).map(([value, { base, subs }]) => {
    const first = base || subs[0];
    return {
      variant: {
        key: primaryKey,
        value,
        image: first?.image || null,
      },
      attributes: subs.map((v) => {
        const a =
          typeof v.attributes === 'string' ? (() => { try { return JSON.parse(v.attributes); } catch { return {}; } })() : (v.attributes || {});
        const subKey = Object.keys(a).find((k) => k !== primaryKey);
        return {
          key: subKey || '',
          value: a[subKey] || '',
          mrp: v.mrp ?? '',
          price: v.price ?? '',
          stock: v.stock ?? 0,
        };
      }),
      mrp: base?.mrp ?? '',
      price: base?.price ?? '',
      stock: base?.stock ?? 0,
      _serverRows: [base, ...subs].filter(Boolean).map((r) => r.id),
    };
  });
}

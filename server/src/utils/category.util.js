/**
 * Damini Marketplace - Category Tree Utilities
 * Helpers to resolve a category slug/id to all of its descendant ids,
 * including itself. Used whenever a product filter or offer scope must
 * include nested sub-categories at any depth.
 */

const { queryRows } = require('../database/connection');

const buildChildrenMap = (rows) => {
  const map = new Map();
  for (const row of rows) {
    const key = row.parent_id ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
};

const collectDescendants = (childrenMap, rootId) => {
  const ids = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop();
    ids.push(id);
    for (const child of childrenMap.get(id) || []) stack.push(child.id);
  }
  return ids;
};

/**
 * Resolve the category ids (including the category itself) for either a
 * `slug` or an `id`. Returns an empty array when the category is missing.
 */
const getDescendantCategoryIds = async ({ slug, id } = {}) => {
  if (!slug && !id) return [];
  const rows = await queryRows('SELECT id, parent_id, slug FROM categories');
  let rootId = id != null ? Number(id) : undefined;
  if (!rootId || Number.isNaN(rootId)) {
    rootId = rows.find((r) => r.slug === slug)?.id;
  }
  if (!rootId) return [];
  return collectDescendants(buildChildrenMap(rows), rootId);
};

module.exports = { getDescendantCategoryIds };
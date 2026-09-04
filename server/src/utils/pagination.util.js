/**
 * Damini Marketplace - Pagination Utility
 */

/**
 * Extract pagination parameters from request query
 * @param {Object} query - req.query
 * @param {number} defaultLimit - Default page size
 * @returns {{ page, limit, offset }}
 */
const getPagination = (query, defaultLimit = 20) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Extract cursor pagination parameters from request query.
 * A cursor is an opaque base64 token (created by encodeCursor) that carries
 * the last row's ordering value + id tie-breaker, so we can do keyset
 * pagination (WHERE value < ? OR (value = ? AND id < ?) ORDER BY value DESC, id DESC)
 * which stays stable when rows are inserted/deleted.
 * @param {Object} query - req.query
 * @param {number} defaultLimit
 * @returns {{ cursor, limit }} cursor = decoded { value, id } or null
 */
const getCursorPagination = (query, defaultLimit = 20) => {
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
  let cursor = null;
  if (query.cursor) {
    try {
      const raw = Buffer.from(query.cursor, 'base64').toString('utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v !== undefined && parsed.id !== undefined) {
        cursor = { value: parsed.v, id: parsed.id, sortKey: parsed.sk };
      }
    } catch (e) {
      cursor = null;
    }
  }
  return { cursor, limit };
};

/**
 * Encode a cursor token for the next page. All three values come from the
 * last row of the current page.
 * @param {string|number} value   - last row's ordering column value
 * @param {string|number} id      - last row's primary key (tie-breaker)
 * @param {string} sortKey        - the ordering column name (so direction is stable)
 * @returns {string} base64 cursor
 */
const encodeCursor = (value, id, sortKey) => {
  const token = JSON.stringify({ v: value, id, sk: sortKey });
  return Buffer.from(token).toString('base64');
};

/**
 * Build ORDER BY clause safely
 * @param {string} sortBy - Field name
 * @param {string} sortOrder - 'asc' or 'desc'
 * @param {string[]} allowedFields - Whitelist of allowed sort fields
 * @param {string} defaultField - Default sort field
 * @returns {string} Safe ORDER BY clause
 */
const getOrderBy = (sortBy, sortOrder, allowedFields, defaultField = 'created_at') => {
  const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
  return `${field} ${order}`;
};

module.exports = { getPagination, getCursorPagination, encodeCursor, getOrderBy };

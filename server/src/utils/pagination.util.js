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

module.exports = { getPagination, getOrderBy };

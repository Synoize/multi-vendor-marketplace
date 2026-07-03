/**
 * Damini Marketplace - Standardized API Response Utility
 */

/**
 * Send a success response
 * @param {Response} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    ...(data !== null && { data }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Send a created response (201)
 */
const sendCreated = (res, data = null, message = 'Created successfully') => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Send an error response
 */
const sendError = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
const sendPaginated = (res, options) => {
  let { data, total, page, limit, message = 'Success' } = options;

  // 1. Extract array data from common keys if not provided directly in 'data'
  const arrayData = data || options.products || options.orders || options.notifications || options.vendors || options.users || options.returns || options.shipments || [];

  // 2. Build the data object format (e.g. for customer store queries)
  const dataObject = {
    products: options.products,
    orders: options.orders,
    notifications: options.notifications,
    vendors: options.vendors,
    users: options.users,
    returns: options.returns,
    total,
  };

  // Filter out undefined attributes
  Object.keys(dataObject).forEach(key => {
    if (dataObject[key] === undefined) delete dataObject[key];
  });

  // Use the wrapper object if multiple keys exist, otherwise fall back to raw array data
  const finalData = data || (Object.keys(dataObject).length > 1 ? dataObject : arrayData);

  return res.status(200).json({
    success: true,
    message,
    data: finalData,
    total,
    ...(options.products && { products: options.products }),
    ...(options.orders && { orders: options.orders }),
    ...(options.notifications && { notifications: options.notifications }),
    ...(options.vendors && { vendors: options.vendors }),
    ...(options.users && { users: options.users }),
    ...(options.returns && { returns: options.returns }),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / (limit || 20)) || 1,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
};

module.exports = { sendSuccess, sendCreated, sendError, sendPaginated };

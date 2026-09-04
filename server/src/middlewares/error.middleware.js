/**
 * Damini Marketplace - Error Handling Middleware
 */

const logger = require('../utils/logger.util');
const config = require('config');

const isDev = config.get('app.env') === 'development';

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'A record with this information already exists.';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Referenced resource does not exist.';
  } else if (err.name === 'ZodError') {
    statusCode = 422;
    message = 'Validation failed';
    return res.status(422).json({
      success: false,
      message,
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds the maximum allowed limit (5MB).';
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Log server errors
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} — ${statusCode}`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && statusCode >= 500 && { stack: err.stack }),
  });
};

/**
 * Async wrapper — eliminates try/catch boilerplate in controllers
 * @param {Function} fn - Async controller function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { notFound, errorHandler, asyncHandler };

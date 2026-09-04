/**
 * Damini Marketplace - Zod Validation Middleware
 * Validates req.body, req.params, and req.query against Zod schemas
 */

const { ZodError } = require('zod');
const { sendError } = require('../utils/response.util');

/**
 * Validate request against a Zod schema
 * @param {ZodSchema} schema - Zod schema to validate against
 * @param {string} source - 'body', 'params', or 'query'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data; // Replace with parsed/coerced data
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }));
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }
      next(err);
    }
  };
};

/**
 * Validate multiple sources at once
 * @param {{ body?: ZodSchema, params?: ZodSchema, query?: ZodSchema }} schemas
 */
const validateAll = (schemas) => {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }
      next(err);
    }
  };
};

module.exports = { validate, validateAll };

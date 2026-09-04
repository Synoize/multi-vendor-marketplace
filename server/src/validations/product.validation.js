/**
 * Damini Marketplace - Product Validation Schemas
 * Zod schemas for all product-related request validation
 */

const { z } = require('zod');

// ─── Reusable Sub-schemas ──────────────────────────────────────────────────────

const dimensionsSchema = z.object({
  length: z.number().positive('Length must be positive'),
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
}).strict();

// ─── Create Product Schema ─────────────────────────────────────────────────────

/**
 * Zod schema for creating a new product
 * Used by vendor when submitting a new product listing
 */
const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .min(3, 'Name must be at least 3 characters')
    .max(500, 'Name cannot exceed 500 characters')
    .trim(),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .optional(),

  short_description: z
    .string()
    .max(500, 'Short description cannot exceed 500 characters')
    .optional(),

  price: z
    .number({ required_error: 'Price is required' })
    .positive('Price must be greater than 0')
    .multipleOf(0.01, 'Price must have at most 2 decimal places'),

  mrp: z
    .number({ required_error: 'MRP is required' })
    .positive('MRP must be greater than 0')
    .multipleOf(0.01, 'MRP must have at most 2 decimal places'),

  cost_price: z
    .number()
    .positive('Cost price must be positive')
    .multipleOf(0.01)
    .optional(),

  category_id: z
    .number({ required_error: 'Category is required' })
    .int('Category ID must be an integer')
    .positive('Category ID must be positive'),

  brand_id: z
    .number()
    .int('Brand ID must be an integer')
    .positive('Brand ID must be positive')
    .optional()
    .nullable(),

  stock: z
    .number({ required_error: 'Stock quantity is required' })
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .default(0),

  low_stock_threshold: z
    .number()
    .int('Low stock threshold must be a whole number')
    .min(0)
    .default(5)
    .optional(),

  weight: z
    .number()
    .positive('Weight must be positive')
    .optional()
    .nullable()
    .describe('Weight in grams'),

  dimensions: dimensionsSchema.optional().nullable(),

  is_returnable: z
    .boolean({ required_error: 'Please specify if product is returnable' })
    .default(true),

  return_type: z
    .enum(['full_return', 'replacement_only', 'refund_only', 'no_return'], {
      errorMap: () => ({ message: 'Invalid return type' }),
    })
    .default('full_return'),

  return_window: z
    .number()
    .int('Return window must be a whole number')
    .min(0, 'Return window cannot be negative')
    .max(30, 'Return window cannot exceed 30 days')
    .default(7),

  seo_title: z
    .string()
    .max(200, 'SEO title cannot exceed 200 characters')
    .optional(),

  seo_description: z
    .string()
    .max(500, 'SEO description cannot exceed 500 characters')
    .optional(),

  seo_keywords: z
    .string()
    .max(300, 'SEO keywords cannot exceed 300 characters')
    .optional(),

  tags: z
    .array(z.string().trim().max(50))
    .max(20, 'Cannot have more than 20 tags')
    .optional()
    .default([]),

  is_cod_available: z
    .boolean()
    .default(true),
}).refine(
  (data) => data.price <= data.mrp,
  { message: 'Selling price cannot exceed MRP', path: ['price'] }
);

// ─── Update Product Schema ─────────────────────────────────────────────────────

/**
 * Zod schema for updating an existing product
 * All fields are optional (partial update)
 */
const updateProductSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(500, 'Name cannot exceed 500 characters')
    .trim()
    .optional(),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .optional(),

  short_description: z
    .string()
    .max(500, 'Short description cannot exceed 500 characters')
    .optional(),

  price: z
    .number()
    .positive('Price must be greater than 0')
    .multipleOf(0.01)
    .optional(),

  mrp: z
    .number()
    .positive('MRP must be greater than 0')
    .multipleOf(0.01)
    .optional(),

  cost_price: z
    .number()
    .positive('Cost price must be positive')
    .multipleOf(0.01)
    .optional()
    .nullable(),

  category_id: z
    .number()
    .int('Category ID must be an integer')
    .positive()
    .optional(),

  brand_id: z
    .number()
    .int('Brand ID must be an integer')
    .positive()
    .optional()
    .nullable(),

  stock: z
    .number()
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .optional(),

  low_stock_threshold: z
    .number()
    .int()
    .min(0)
    .optional(),

  weight: z
    .number()
    .positive('Weight must be positive')
    .optional()
    .nullable(),

  dimensions: dimensionsSchema.optional().nullable(),

  is_returnable: z.boolean().optional(),

  return_type: z
    .enum(['full_return', 'replacement_only', 'refund_only', 'no_return'])
    .optional(),

  return_window: z
    .number()
    .int()
    .min(0)
    .max(30)
    .optional(),

  seo_title: z.string().max(200).optional(),
  seo_description: z.string().max(500).optional(),
  seo_keywords: z.string().max(300).optional(),

  tags: z
    .array(z.string().trim().max(50))
    .max(20)
    .optional(),

  is_cod_available: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  status: z
    .enum(['draft', 'pending', 'active', 'discontinued'])
    .optional(),
});

// ─── Variant Schema ────────────────────────────────────────────────────────────

/**
 * Zod schema for creating/updating a product variant
 */
const variantSchema = z.object({
  sku: z
    .string({ required_error: 'SKU is required' })
    .min(3, 'SKU must be at least 3 characters')
    .max(100, 'SKU cannot exceed 100 characters')
    .trim()
    .toUpperCase(),

  name: z
    .string({ required_error: 'Variant name is required' })
    .min(1, 'Variant name is required')
    .max(200, 'Variant name cannot exceed 200 characters')
    .trim(),

  attributes: z
    .record(z.string(), z.union([z.string(), z.number()]), {
      required_error: 'Attributes are required (e.g. { color: "Red", size: "XL" })',
    })
    .refine(
      (obj) => Object.keys(obj).length > 0,
      { message: 'At least one attribute is required' }
    ),

  price: z
    .number({ required_error: 'Variant price is required' })
    .positive('Price must be positive')
    .multipleOf(0.01),

  mrp: z
    .number({ required_error: 'Variant MRP is required' })
    .positive('MRP must be positive')
    .multipleOf(0.01),

  stock: z
    .number({ required_error: 'Variant stock is required' })
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative'),

  image: z
    .string()
    .url('Image must be a valid URL')
    .optional()
    .nullable(),

  is_active: z
    .boolean()
    .default(true)
    .optional(),
}).refine(
  (data) => data.price <= data.mrp,
  { message: 'Variant price cannot exceed MRP', path: ['price'] }
);

/**
 * Zod schema for updating a variant (all fields optional except type checks)
 */
const updateVariantSchema = variantSchema.partial().extend({
  // ensure sku uppercase even on update
  sku: z.string().min(3).max(100).trim().toUpperCase().optional(),
});

// ─── Product Query / Filter Schema ────────────────────────────────────────────

/**
 * Zod schema for product listing query parameters
 * Handles coercion from string (URL params are always strings)
 */
const productQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => Math.max(1, parseInt(val) || 1)),

  limit: z
    .string()
    .optional()
    .transform((val) => Math.min(100, Math.max(1, parseInt(val) || 20))),

  sort: z
    .enum(['created_at', 'price', 'rating', 'sale_count', 'name', 'view_count'])
    .optional()
    .default('created_at'),

  order: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),

  search: z
    .string()
    .max(200, 'Search query too long')
    .trim()
    .optional(),

  category: z
    .string()
    .optional()
    .describe('Category slug or ID'),

  brand: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val ? String(val) : undefined))
    .describe('Brand slug or ID'),

  vendor: z
    .string()
    .optional()
    .describe('Vendor ID'),

  min_price: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),

  max_price: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),

  min_rating: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),

  in_stock: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),

  is_featured: z
    .string()
    .optional()
    .transform((val) => (val === 'true' || val === '1' ? true : undefined)),

  is_cod_available: z
    .string()
    .optional()
    .transform((val) => (val === 'true' || val === '1' ? true : undefined)),

  status: z
    .enum(['draft', 'pending', 'active', 'rejected', 'blocked', 'out_of_stock', 'discontinued'])
    .optional(),
});

// ─── Bulk Import Schema ────────────────────────────────────────────────────────

/**
 * Zod schema for a single product row in bulk CSV import
 */
const bulkImportRowSchema = z.object({
  name: z.string().min(3).max(500).trim(),
  description: z.string().optional(),
  price: z.string().transform((v) => parseFloat(v)),
  mrp: z.string().transform((v) => parseFloat(v)),
  category_id: z.string().transform((v) => parseInt(v)),
  brand_id: z.string().optional().transform((v) => (v ? parseInt(v) : null)),
  stock: z.string().optional().transform((v) => (v ? parseInt(v) : 0)),
  weight: z.string().optional().transform((v) => (v ? parseFloat(v) : null)),
  sku: z.string().optional(),
  tags: z.string().optional().transform((v) => (v ? v.split('|').map((t) => t.trim()) : [])),
  is_cod_available: z.string().optional().transform((v) => v !== 'false' && v !== '0'),
  is_returnable: z.string().optional().transform((v) => v !== 'false' && v !== '0'),
  return_type: z
    .enum(['full_return', 'replacement_only', 'refund_only', 'no_return'])
    .optional()
    .default('full_return'),
  return_window: z.string().optional().transform((v) => (v ? parseInt(v) : 7)),
  seo_title: z.string().max(200).optional(),
  seo_description: z.string().max(500).optional(),
  seo_keywords: z.string().max(300).optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  variantSchema,
  updateVariantSchema,
  productQuerySchema,
  bulkImportRowSchema,
};

/**
 * Damini Marketplace - Vendor Middleware
 * Attaches vendor data to req.vendor for vendor-protected routes
 */

const { queryOne } = require('../database/connection');
const { sendError } = require('../utils/response.util');

/**
 * Attach vendor profile to request
 * Must be used AFTER protect middleware
 */
const attachVendor = async (req, res, next) => {
  try {
    const vendor = await queryOne(
      `SELECT v.*, u.name as owner_name, u.email, u.phone 
       FROM vendors v
       JOIN users u ON v.user_id = u.id
       WHERE v.user_id = ? AND v.is_active = 1`,
      [req.user.id]
    );

    if (!vendor) {
      return sendError(res, 'Vendor profile not found. Please complete your vendor registration.', 403);
    }

    req.vendor = vendor;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Require vendor KYC to be approved
 */
const requireKYCApproved = (req, res, next) => {
  if (!req.vendor) {
    return sendError(res, 'Vendor authentication required', 401);
  }
  if (req.vendor.kyc_status !== 'approved') {
    return sendError(
      res,
      `KYC verification required. Current status: ${req.vendor.kyc_status}. Please complete KYC to access this feature.`,
      403
    );
  }
  next();
};

module.exports = { attachVendor, requireKYCApproved };

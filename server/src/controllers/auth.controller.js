/**
 * Damini Marketplace - Auth Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendError } = require('../utils/response.util');
const { setAuthCookies, clearAuthCookies, verifyAccessToken, getAccessTokenFromCookies, getRefreshTokenFromCookies } = require('../utils/token.util');
const { queryOne } = require('../database/connection');
const authService = require('../services/auth.service');

/** POST /auth/register */
const register = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body.email);
  sendCreated(res, null, result.message);
});

/** POST /auth/verify-email */
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const { accessToken, refreshToken, user, message } = await authService.verifyEmail(email, otp);
  setAuthCookies(res, accessToken, refreshToken, user.role);
  sendSuccess(res, { user, accessToken }, message);
});

/** POST /auth/resend-otp */
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendOTP(email);
  sendSuccess(res, null, result.message);
});

/** POST /auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);
  if (result.directLogin) {
    setAuthCookies(res, result.accessToken, result.refreshToken, result.user.role);
    sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Login successful');
  } else {
    sendSuccess(res, null, result.message);
  }
});

/** POST /auth/vendor/request-otp */
const requestVendorOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.requestVendorOtp(email);
  sendSuccess(res, null, result.message);
});

/** POST /auth/vendor/verify-otp */
const verifyVendorOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const { accessToken, refreshToken, user, message } = await authService.verifyVendorOtp(email, otp);
  setAuthCookies(res, accessToken, refreshToken, user.role);
  sendSuccess(res, { user, accessToken }, message);
});

/** POST /auth/forgot-password */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  sendSuccess(res, null, result.message);
});

/** POST /auth/reset-password */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const result = await authService.resetPassword(email, otp, newPassword);
  sendSuccess(res, null, result.message);
});

/** POST /auth/refresh */
const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken || getRefreshTokenFromCookies(req.cookies);
  const result = await authService.refreshAccessToken(refreshToken);
  setAuthCookies(res, result.accessToken, result.refreshToken, result.role);
  sendSuccess(res, { accessToken: result.accessToken });
});

/** POST /auth/logout */
const logout = asyncHandler(async (req, res) => {
  // Revoke server-side tokens when a user is identifiable, even if the
  // access token is expired — decode the cookie as a fallback.
  let userId = req.user?.id;
  let role = req.user?.role;
  if (!userId) {
    const token = getAccessTokenFromCookies(req.cookies);
    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        userId = decoded.id;
        role = decoded.role;
      } catch (e) { /* expired/invalid */ }
    }
  }
  if (userId) {
    await authService.logoutUser(userId);
  }
  clearAuthCookies(res, role);
  sendSuccess(res, null, 'Logged out successfully');
});

/** GET /auth/me */
const getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  const vendor = await queryOne(
    'SELECT id, kyc_status, kyc_rejected_reason, store_name FROM vendors WHERE user_id = ?',
    [user.id]
  );
  if (vendor) {
    user.vendor_id = vendor.id;
    user.vendor_status = vendor.kyc_status;
    user.vendor_rejected_reason = vendor.kyc_rejected_reason || null;
    user.store_name = vendor.store_name;
  } else {
    user.vendor_status = null;
  }
  sendSuccess(res, user);
});

module.exports = { register, verifyEmail, resendOTP, login, requestVendorOtp, verifyVendorOtp, forgotPassword, resetPassword, refresh, logout, getMe };

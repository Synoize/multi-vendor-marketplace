/**
 * Damini Marketplace - Auth Controller
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendError } = require('../utils/response.util');
const { setAuthCookies, clearAuthCookies } = require('../utils/token.util');
const authService = require('../services/auth.service');

/** POST /auth/register */
const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  sendCreated(res, null, result.message);
});

/** POST /auth/verify-email */
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const result = await authService.verifyEmail(email, otp);
  sendSuccess(res, null, result.message);
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
  const { accessToken, refreshToken, user } = await authService.loginUser(email, password);
  setAuthCookies(res, accessToken, refreshToken);
  sendSuccess(res, { user, accessToken }, 'Login successful');
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
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await authService.refreshAccessToken(refreshToken);
  sendSuccess(res, result);
});

/** POST /auth/logout */
const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user.id);
  clearAuthCookies(res);
  sendSuccess(res, null, 'Logged out successfully');
});

/** GET /auth/me */
const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, req.user);
});

module.exports = { register, verifyEmail, resendOTP, login, forgotPassword, resetPassword, refresh, logout, getMe };

/**
 * Damini Marketplace - Auth Routes
 */

const express = require('express');
const { register, verifyEmail, resendOTP, login, requestVendorOtp, verifyVendorOtp, forgotPassword, resetPassword, refresh, logout, getMe } = require('../controllers/auth.controller');
const { protect, optionalAuth } = require('../middlewares/auth.middleware');
const { authRateLimit, otpRateLimit } = require('../middlewares/rateLimit.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { z } = require('zod');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
});

const otpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6).regex(/^\d+$/),
});

const forgotSchema = z.object({ email: z.string().email() });

const resetSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/),
});

router.post('/register', authRateLimit, validate(registerSchema), register);
router.post('/verify-email', otpRateLimit, validate(otpSchema), verifyEmail);
router.post('/resend-otp', otpRateLimit, validate(forgotSchema), resendOTP);
router.post('/login', authRateLimit, validate(loginSchema), login);
router.post('/vendor/request-otp', otpRateLimit, validate(forgotSchema), requestVendorOtp);
router.post('/vendor/verify-otp', otpRateLimit, validate(otpSchema), verifyVendorOtp);
router.post('/forgot-password', otpRateLimit, validate(forgotSchema), forgotPassword);
router.post('/reset-password', validate(resetSchema), resetPassword);
router.post('/refresh', refresh);
router.post('/logout', optionalAuth, logout);
router.get('/me', protect, getMe);

module.exports = router;

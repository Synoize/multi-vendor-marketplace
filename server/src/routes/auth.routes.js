/**
 * Damini Marketplace - Auth Routes
 */

const express = require('express');
const { register, verifyEmail, resendOTP, login, requestVendorOtp, verifyVendorOtp, forgotPassword, resetPassword, refresh, logout, getMe } = require('../controllers/auth.controller');
const { protect, optionalAuth } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
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
  referralCode: z.string().optional().nullable(),
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

router.post('/register', rateLimit('auth'), validate(registerSchema), register);
router.post('/verify-email', rateLimit('otp'), validate(otpSchema), verifyEmail);
router.post('/resend-otp', rateLimit('otp'), validate(forgotSchema), resendOTP);
router.post('/login', rateLimit('auth'), validate(loginSchema), login);
router.post('/vendor/request-otp', rateLimit('otp'), validate(forgotSchema), requestVendorOtp);
router.post('/vendor/verify-otp', rateLimit('otp'), validate(otpSchema), verifyVendorOtp);
router.post('/forgot-password', rateLimit('auth'), validate(forgotSchema), forgotPassword);
router.post('/reset-password', rateLimit('auth'), validate(resetSchema), resetPassword);
router.post('/refresh', rateLimit('write'), refresh);
router.post('/logout', optionalAuth, rateLimit('write'), logout);
router.get('/me', protect, rateLimit('read'), getMe);

module.exports = router;

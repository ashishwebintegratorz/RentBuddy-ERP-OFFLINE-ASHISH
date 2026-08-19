import rateLimit from 'express-rate-limit';

// Login brute-force protection: 10 attempts per minute
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 60 seconds.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP request limiter: 5 requests per 5 minutes
export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait a few minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter: 300 requests per minute
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

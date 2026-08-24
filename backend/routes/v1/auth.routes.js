import { Router } from 'express';
import {
  login,
  changeSelfPassword,
  getProfile,
  checkDriverPhone,
  sendDriverOtp,
  verifyDriverOtp,
  loginDriverWithPin,
  completeDriverOnboarding,
  deleteDriverAccount
} from '../../controllers/auth.controller.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { loginLimiter, otpLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { validatePhoneForOtp, validateOtpPayload } from '../../middlewares/otp.middleware.js';

const router = Router();

// Console Admin / Staff Authentication
router.post('/login', loginLimiter, login);
router.get('/profile', authenticateToken, getProfile);
router.put('/password', authenticateToken, changeSelfPassword);

// Rider Mobile App Auth Endpoints (mapped for Flutter Rider App)
router.post('/driver/check-phone', checkDriverPhone);
router.post('/driver/send-otp', otpLimiter, validatePhoneForOtp, sendDriverOtp);
router.post('/driver/verify-otp', validateOtpPayload, verifyDriverOtp);
router.post('/driver/login-with-pin', loginLimiter, loginDriverWithPin);
router.post('/driver/complete-onboarding', completeDriverOnboarding);
router.post('/driver/delete-account', deleteDriverAccount);
router.delete('/driver/delete-account', deleteDriverAccount);

export default router;

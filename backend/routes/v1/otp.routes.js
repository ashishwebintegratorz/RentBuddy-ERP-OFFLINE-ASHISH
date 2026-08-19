import { Router } from 'express';
import { sendOtp, verifyOtp } from '../../controllers/otp.controller.js';
import { validatePhoneForOtp, validateOtpPayload } from '../../middlewares/otp.middleware.js';
import { otpLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

// OTP Endpoints
// POST /api/v1/otp/send
router.post('/send', otpLimiter, validatePhoneForOtp, sendOtp);

// POST /api/v1/otp/verify
router.post('/verify', validateOtpPayload, verifyOtp);

export default router;

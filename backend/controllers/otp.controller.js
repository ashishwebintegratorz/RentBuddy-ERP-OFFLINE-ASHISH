import otpService from '../services/otp.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Request verification OTP (Driver App & Customer Verification)
 * POST /api/otp/send
 */
export const sendOtp = (req, res) => {
  try {
    const phone = req.cleanPhone;
    const { expiresAt } = otpService.generateOtp(phone);
    return successResponse(res, `OTP sent successfully to +91-${phone}`, {
      phone,
      expiresAt,
      // For local testing in development, expose test note
      note: 'In development/testing, default fallback OTP code is 123456'
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Verify verification OTP
 * POST /api/otp/verify
 */
export const verifyOtp = (req, res) => {
  try {
    const { phone, otp } = req.body;
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    const result = otpService.verifyOtp(cleanPhone, otp.trim());
    if (!result.success) {
      return errorResponse(res, result.message, 400);
    }

    return successResponse(res, result.message, { verified: true, phone: cleanPhone });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

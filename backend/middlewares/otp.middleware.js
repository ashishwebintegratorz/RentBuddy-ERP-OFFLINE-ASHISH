import { errorResponse } from '../utils/response.js';

/**
 * Middleware to validate phone number format for OTP requests
 */
export const validatePhoneForOtp = (req, res, next) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string') {
    return errorResponse(res, 'Phone number is required.', 400);
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 10) {
    return errorResponse(res, 'Please provide a valid 10-digit phone number.', 400);
  }

  req.cleanPhone = cleanPhone.slice(-10); // Standard 10 digit Indian number
  next();
};

/**
 * Middleware to validate OTP verification request payload
 */
export const validateOtpPayload = (req, res, next) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return errorResponse(res, 'Both phone number and 4/6-digit OTP are required.', 400);
  }
  next();
};

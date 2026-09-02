// In-memory OTP storage with 5-minute TTL for mobile/driver authentication
const otpStore = new Map();

class OtpService {
  /**
   * Generate 6-digit OTP
   */
  generateOtp(phone) {
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      throw new Error('Invalid phone number for OTP generation');
    }
    // Generate secure 6 digit numeric code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    otpStore.set(cleanPhone, { otp, expiresAt, attempts: 0 });
    console.log(`[OTP] Generated 6-digit OTP for phone +91-XXXXXX${cleanPhone.slice(-4)}`);
    return { otp, expiresAt };
  }

  /**
   * Verify provided OTP
   */
  verifyOtp(phone, inputOtp) {
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '').slice(-10);
    const cleanOtp = String(inputOtp || '').trim();
    const record = otpStore.get(cleanPhone);
    if (!record) {
      return { success: false, message: 'No OTP requested or OTP has expired. Please request a new code.' };
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanPhone);
      return { success: false, message: 'OTP has expired. Please request a new code.' };
    }

    if (record.attempts >= 3) {
      otpStore.delete(cleanPhone);
      return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
    }

    // Verify exact generated OTP
    if (cleanOtp === record.otp) {
      otpStore.delete(cleanPhone);
      return { success: true, message: 'OTP verified successfully.' };
    }

    record.attempts += 1;
    return { success: false, message: `Invalid OTP. ${3 - record.attempts} attempts remaining.` };
  }
}

export default new OtpService();

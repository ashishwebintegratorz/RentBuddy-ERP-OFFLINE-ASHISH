// In-memory OTP storage with 5-minute TTL for mobile/driver authentication
const otpStore = new Map();

class OtpService {
  /**
   * Generate 6-digit OTP
   */
  generateOtp(phone) {
    // Generate secure 6 digit numeric code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    otpStore.set(phone, { otp, expiresAt, attempts: 0 });

    console.log('\n======================================================');
    console.log('🔑 [RENTBUDDY DRIVER LOGIN OTP]');
    console.log(`📱 Phone Number  : +91-${phone}`);
    console.log(`🔢 6-Digit OTP   : >>> ${otp} <<<`);
    console.log('⏳ Valid For     : 5 Minutes');
    console.log('======================================================\n');
    return { otp, expiresAt };
  }

  /**
   * Verify provided OTP
   */
  verifyOtp(phone, inputOtp) {
    const record = otpStore.get(phone);
    if (!record) {
      return { success: false, message: 'No OTP requested or OTP has expired. Please request a new code.' };
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(phone);
      return { success: false, message: 'OTP has expired. Please request a new code.' };
    }

    if (record.attempts >= 3) {
      otpStore.delete(phone);
      return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
    }

    // Verify exact generated OTP
    if (inputOtp === record.otp) {
      otpStore.delete(phone);
      return { success: true, message: 'OTP verified successfully.' };
    }

    record.attempts += 1;
    return { success: false, message: `Invalid OTP. ${3 - record.attempts} attempts remaining.` };
  }
}

export default new OtpService();

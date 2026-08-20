import authService from '../services/auth.service.js';
import otpService from '../services/otp.service.js';
import { Driver } from '../models/index.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { getDbStatus } from '../config/db.js';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return errorResponse(res, 'Invalid username or password format', 400);
    }

    const { token, user } = await authService.login(username, password);
    return successResponse(res, 'Login successful', { token, user });
  } catch (err) {
    return errorResponse(res, err.message, 401);
  }
};

export const changeSelfPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return errorResponse(res, 'Both old and new passwords are required', 400);
    }

    await authService.changeSelfPassword(req.user.username, oldPassword, newPassword);
    return successResponse(res, 'Your password has been changed successfully');
  } catch (err) {
    return errorResponse(res, err.message, 400);
  }
};

export const getProfile = async (req, res) => {
  return successResponse(res, 'Profile retrieved', { user: req.user });
};

// ==================== DRIVER / RIDER APP AUTH ====================

export const sendDriverOtp = async (req, res) => {
  try {
    const rawPhone = req.body.phone || req.cleanPhone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return errorResponse(res, 'A valid 10-digit mobile number is required', 400);
    }

    const { otp, expiresAt } = otpService.generateOtp(cleanPhone);

    let exists = false;
    let hasPin = false;

    if (getDbStatus()) {
      const driver = await Driver.findOne({ phone: cleanPhone });
      if (driver) {
        exists = true;
        hasPin = !!(driver.pin || driver.hasPin);
      }
    }

    return successResponse(res, 'OTP sent successfully', {
      phone: cleanPhone,
      exists,
      hasPin,
      otp,
      expiresAt,
      note: 'OTP printed in backend console terminal'
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const verifyDriverOtp = async (req, res) => {
  try {
    const { phone, otp, pin } = req.body;
    if (!phone || !otp) {
      return errorResponse(res, 'Phone and OTP are required', 400);
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    const otpResult = otpService.verifyOtp(cleanPhone, otp.trim());
    if (!otpResult.success) {
      return errorResponse(res, otpResult.message, 400);
    }

    let driver = null;
    if (getDbStatus()) {
      driver = await Driver.findOne({ phone: cleanPhone });
      if (!driver) {
        // Create new driver record for first-time onboarding
        driver = await Driver.create({
          id: `DRV-${Date.now().toString().slice(-4)}`,
          fullName: 'Rider Driver',
          phone: cleanPhone,
          pin: pin || null,
          hasPin: !!pin,
          status: 'Active',
          verificationStatus: 'Pending',
          joiningDate: new Date().toISOString().split('T')[0]
        });
      } else if (pin) {
        driver.pin = pin;
        driver.hasPin = true;
        await driver.save();
      }
    }

    const token = authService.generateToken({
      userId: driver?._id || `driver-${cleanPhone}`,
      phone: cleanPhone,
      role: 'driver',
      city: driver?.city || 'Indore (Head Office)'
    });

    const userPayload = {
      _id: driver?._id || `driver-${cleanPhone}`,
      id: driver?.id || `DRV-${cleanPhone.slice(-4)}`,
      phone: cleanPhone,
      role: 'driver',
      name: driver?.fullName || 'Rider Driver',
      isOnline: driver?.status === 'Active',
      hasPin: !!(driver?.pin || driver?.hasPin || pin)
    };

    return successResponse(res, 'OTP verified successfully', {
      access_token: token,
      token,
      refresh_token: token,
      user: userPayload
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const loginDriverWithPin = async (req, res) => {
  try {
    const { phone, pin } = req.body;
    if (!phone || !pin) {
      return errorResponse(res, 'Phone and PIN are required', 400);
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    let driver = null;
    if (getDbStatus()) {
      driver = await Driver.findOne({ phone: cleanPhone });
    }

    // Check PIN matching or fallback test pin
    if (driver && driver.pin && driver.pin !== pin.trim() && pin.trim() !== '1234') {
      return errorResponse(res, 'Invalid 4-digit security PIN', 401);
    }

    const token = authService.generateToken({
      userId: driver?._id || `driver-${cleanPhone}`,
      phone: cleanPhone,
      role: 'driver',
      city: driver?.city || 'Indore (Head Office)'
    });

    const userPayload = {
      _id: driver?._id || `driver-${cleanPhone}`,
      id: driver?.id || `DRV-${cleanPhone.slice(-4)}`,
      riderId: driver?.id || `DRV-${cleanPhone.slice(-4)}`,
      phone: cleanPhone,
      role: 'driver',
      name: driver?.fullName || 'Rider Driver',
      avatar: driver?.documents?.profilePhoto || driver?.documents?.selfiePhoto || '',
      isOnline: driver?.status === 'Active',
      hasPin: true
    };

    return successResponse(res, 'Driver login successful', {
      access_token: token,
      token,
      refresh_token: token,
      user: userPayload
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const completeDriverOnboarding = async (req, res) => {
  try {
    const {
      name,
      fullName,
      phone,
      alternatePhone,
      city,
      vehicleNumber,
      vehicleType,
      upiId,
      pin,
      profilePhoto,
      aadhaarFront,
      aadhaarBack,
      licenseFront,
      vehiclePhoto
    } = req.body;

    const driverName = name || fullName || 'Logistic Rider';
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '').slice(-10);

    if (!cleanPhone) {
      return errorResponse(res, 'Driver phone number is required', 400);
    }

    const driverId = `DRV-${cleanPhone.slice(-4)}`;
    const driverCity = city || 'Indore (Head Office)';

    let driver = null;
    const docPayload = {
      profilePhoto: profilePhoto || '',
      selfiePhoto: profilePhoto || '',
      aadhaarFront: aadhaarFront || '',
      aadhaarBack: aadhaarBack || '',
      licenseFront: licenseFront || '',
      vehiclePhoto: vehiclePhoto || '',
      vehicleRc: vehiclePhoto || ''
    };

    if (getDbStatus()) {
      driver = await Driver.findOne({ phone: cleanPhone });

      if (driver) {
        driver.fullName = driverName;
        driver.city = driverCity;
        driver.vehicleNumber = vehicleNumber || driver.vehicleNumber || 'MP 09 RB 1234';
        driver.vehicleType = vehicleType || driver.vehicleType || 'Two Wheeler / Bike';
        driver.upiId = upiId || driver.upiId || '';
        driver.pin = pin || driver.pin || '1234';
        driver.hasPin = true;
        driver.verificationStatus = 'Verified';
        driver.status = 'Active';
        driver.documents = { ...(driver.documents || {}), ...docPayload };
        await driver.save();
      } else {
        driver = await Driver.create({
          id: driverId,
          fullName: driverName,
          phone: cleanPhone,
          alternatePhone: alternatePhone || '',
          city: driverCity,
          vehicleNumber: vehicleNumber || 'MP 09 RB 1234',
          vehicleType: vehicleType || 'Two Wheeler / Bike',
          upiId: upiId || '',
          pin: pin || '1234',
          hasPin: true,
          status: 'Active',
          verificationStatus: 'Verified',
          joiningDate: new Date().toISOString().split('T')[0],
          totalDelivered: 0,
          pendingDeliveries: 0,
          deadlineOverdue: 0,
          rating: 5.0,
          documents: docPayload
        });
      }
    }

    const token = authService.generateToken({
      userId: driver?._id || `driver-${cleanPhone}`,
      phone: cleanPhone,
      role: 'driver',
      city: driverCity
    });

    const userPayload = {
      _id: driver?._id || `driver-${cleanPhone}`,
      id: driver?.id || driverId,
      riderId: driver?.id || driverId,
      phone: cleanPhone,
      name: driverName,
      role: 'driver',
      city: driverCity,
      avatar: profilePhoto || '',
      isOnline: false,
      hasPin: true,
      vehicleNumber: vehicleNumber || driver?.vehicleNumber,
      documents: docPayload
    };

    return successResponse(res, 'Driver onboarding completed successfully', {
      access_token: token,
      token,
      refresh_token: token,
      user: userPayload,
      driver
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};


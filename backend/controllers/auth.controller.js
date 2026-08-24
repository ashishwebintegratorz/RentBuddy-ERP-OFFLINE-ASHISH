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

export const checkDriverPhone = async (req, res) => {
  try {
    const rawPhone = req.body.phone || req.query.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return errorResponse(res, 'A valid 10-digit mobile number is required', 400);
    }

    let isRegistered = false;
    let hasPin = false;
    let name = 'Rider';
    let city = 'Indore';

    if (getDbStatus()) {
      const driver = await Driver.findOne({
        $or: [
          { phone: cleanPhone },
          { phone: `+91${cleanPhone}` },
          { phone: `+91-${cleanPhone}` },
          { phone: { $regex: cleanPhone } },
          { alternatePhone: { $regex: cleanPhone } },
          { id: { $regex: cleanPhone.slice(-4) } }
        ]
      });
      if (driver) {
        isRegistered = true;
        hasPin = !!(driver.pin || driver.hasPin);
        name = driver.fullName || 'Rider';
        city = driver.city || 'Indore';
      }
    }

    return successResponse(res, 'Phone status checked', {
      phone: cleanPhone,
      isRegistered,
      hasPin,
      name,
      city
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

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
      driver = await Driver.findOne({
        $or: [
          { phone: cleanPhone },
          { phone: `+91${cleanPhone}` },
          { phone: `+91-${cleanPhone}` },
          { phone: { $regex: cleanPhone } },
          { alternatePhone: { $regex: cleanPhone } }
        ]
      });
    }

    // Check PIN matching strictly against driver record
    if (driver && driver.pin && driver.pin !== pin.trim()) {
      return errorResponse(res, 'Invalid 4-digit security PIN', 401);
    }

    const token = authService.generateToken({
      userId: driver?._id || `driver-${cleanPhone}`,
      phone: cleanPhone,
      role: 'driver',
      city: driver?.city || 'Indore (Head Office)'
    });

    const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23e11d48"><circle cx="50" cy="50" r="50" fill="%23f1f5f9"/><circle cx="50" cy="38" r="20" fill="%2394a3b8"/><path d="M15 90c0-19.33 15.67-35 35-35s35 15.67 35 35" fill="%2394a3b8"/></svg>';
    const avatarUrl = driver?.documents?.profilePhoto || driver?.documents?.selfiePhoto || defaultAvatar;

    const userPayload = {
      _id: driver?._id || `driver-${cleanPhone}`,
      id: driver?.id || `DRV-${cleanPhone.slice(-4)}`,
      riderId: driver?.id || `DRV-${cleanPhone.slice(-4)}`,
      phone: cleanPhone,
      role: 'driver',
      name: driver?.fullName || 'Fleet Driver',
      avatar: avatarUrl,
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
      driver = await Driver.findOne({
        $or: [
          { phone: cleanPhone },
          { phone: `+91${cleanPhone}` },
          { phone: `+91-${cleanPhone}` },
          { phone: { $regex: cleanPhone } },
          { alternatePhone: { $regex: cleanPhone } }
        ]
      });

      if (driver) {
        driver.fullName = driverName;
        driver.phone = cleanPhone;
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

export const deleteDriverAccount = async (req, res) => {
  try {
    const rawPhone = req.body.phone || req.query.phone || (req.user && req.user.phone) || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return errorResponse(res, 'A valid 10-digit mobile number is required to delete account', 400);
    }

    if (getDbStatus()) {
      // 1. Remove from Driver collection
      await Driver.deleteMany({
        $or: [
          { phone: cleanPhone },
          { phone: `+91${cleanPhone}` },
          { phone: `+91-${cleanPhone}` },
          { phone: { $regex: cleanPhone } },
          { alternatePhone: { $regex: cleanPhone } }
        ]
      });

      // 2. Unlink driver from active/assigned orders (keep delivery history/POD intact)
      await Order.updateMany(
        { assignedDriverPhone: { $regex: cleanPhone } },
        {
          $set: {
            assignedDriverPhone: '',
            assignedDriverName: 'Unassigned',
            assignedLogisticsUser: 'Unassigned'
          }
        }
      );
    }

    return successResponse(res, 'Driver account permanently deleted from the system');
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};


import driverService from '../services/driver.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getDrivers = async (req, res) => {
  try {
    const drivers = await driverService.getAllDrivers();
    return successResponse(res, 'Drivers fetched successfully', { drivers });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const getDriverById = async (req, res) => {
  try {
    const driver = await driverService.getDriverById(req.params.id);
    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }
    return successResponse(res, 'Driver fetched successfully', { driver });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const createDriver = async (req, res) => {
  try {
    const driverData = req.body;
    if (!driverData.fullName || !driverData.phone) {
      return errorResponse(res, 'Full name and phone are mandatory to register a driver', 400);
    }

    const created = await driverService.createDriver(driverData);
    return successResponse(res, 'Driver onboarded successfully', { driver: created }, 201);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await driverService.updateDriver(id, updates);
    return successResponse(res, 'Driver updated successfully', { driver: updated });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const updateDriverStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verificationStatus, verificationNotes } = req.body;
    const updated = await driverService.updateDriverStatus(id, { status, verificationStatus, verificationNotes });
    return successResponse(res, 'Driver status updated successfully', { driver: updated });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const toggleBlockDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked, blockedReason } = req.body;
    const updated = await driverService.blockDriver(id, { isBlocked, blockedReason });
    return successResponse(
      res,
      isBlocked ? 'Driver blocked successfully' : 'Driver unblocked successfully',
      { driver: updated }
    );
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const updateDriverDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { documents } = req.body;
    const updated = await driverService.updateDocuments(id, documents);
    return successResponse(res, 'Driver documents updated successfully', { driver: updated });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// 📊 Dynamic Driver Logistics Summary (Calculated from real Order collection)
export const getDriverSummary = async (req, res) => {
  try {
    const driverPhone = req.user?.phone || req.query.phone || '';
    const driverId = req.user?.id || req.query.driverId || '';
    const cleanPhone = driverPhone.replace(/[^0-9]/g, '').slice(-10);

    const filter = [];
    if (cleanPhone) filter.push({ assignedDriverPhone: new RegExp(cleanPhone, 'i') });
    if (driverId) filter.push({ assignedDriverId: driverId });

    let totalDelivered = 0;
    let todayDeliveries = 0;
    let pendingDeliveries = 0;
    let driverRating = 5.0;

    const { Order, Driver } = await import('../models/index.js');
    if (filter.length > 0) {
      const orders = await Order.find({ $or: filter });
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      totalDelivered = orders.filter(o => o.status === 'DELIVERED' || o.deliveryStatus === 'delivered').length;
      todayDeliveries = orders.filter(o => {
        const isDelivered = o.status === 'DELIVERED' || o.deliveryStatus === 'delivered';
        const deliveredDate = o.deliveredAt ? new Date(o.deliveredAt) : (o.updatedAt ? new Date(o.updatedAt) : null);
        return isDelivered && deliveredDate && deliveredDate >= todayStart;
      }).length;
      pendingDeliveries = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'RETURNED').length;

      const driverRec = await Driver.findOne(cleanPhone ? { phone: new RegExp(cleanPhone, 'i') } : { id: driverId });
      if (driverRec && driverRec.rating) {
        driverRating = driverRec.rating;
      }
    }

    const perDeliveryRate = 250; // Standard ERP commission per furniture delivery
    const todayEarnings = todayDeliveries * perDeliveryRate;

    return successResponse(res, 'Driver summary fetched successfully', {
      totalDeliveries: totalDelivered,
      todayDeliveries,
      todayEarnings,
      pendingDeliveries,
      rating: driverRating
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// 💰 Dynamic Driver Wallet Balance
export const getDriverWallet = async (req, res) => {
  try {
    const driverPhone = req.user?.phone || req.query.phone || '';
    const driverId = req.user?.id || req.query.driverId || '';
    const cleanPhone = driverPhone.replace(/[^0-9]/g, '').slice(-10);

    const filter = [];
    if (cleanPhone) filter.push({ assignedDriverPhone: new RegExp(cleanPhone, 'i') });
    if (driverId) filter.push({ assignedDriverId: driverId });

    let totalDeliveries = 0;
    const { Order } = await import('../models/index.js');
    if (filter.length > 0) {
      const orders = await Order.find({ $or: filter });
      totalDeliveries = orders.filter(o => o.status === 'DELIVERED' || o.deliveryStatus === 'delivered').length;
    }

    const perDeliveryRate = 250;
    const totalEarnings = totalDeliveries * perDeliveryRate;
    const pendingPayout = Math.min(totalEarnings, 1200);
    const balance = Math.max(0, totalEarnings - pendingPayout);

    return successResponse(res, 'Driver wallet fetched successfully', {
      balance,
      totalEarnings,
      completedDeliveries: totalDeliveries,
      currency: 'INR',
      pendingPayout
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// 💵 Dynamic Driver COD Cash-in-Hand Balance
export const getDriverCodBalance = async (req, res) => {
  try {
    const driverPhone = req.user?.phone || req.query.phone || '';
    const driverId = req.user?.id || req.query.driverId || '';
    const cleanPhone = driverPhone.replace(/[^0-9]/g, '').slice(-10);

    const filter = [];
    if (cleanPhone) filter.push({ assignedDriverPhone: new RegExp(cleanPhone, 'i') });
    if (driverId) filter.push({ assignedDriverId: driverId });

    let cashInHand = 0;
    let collectedToday = 0;

    const { Order } = await import('../models/index.js');
    if (filter.length > 0) {
      const orders = await Order.find({ $or: filter });
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const codOrders = orders.filter(o => (o.paymentMode === 'COD' || o.paymentMethod === 'Cash on Delivery') && (o.status === 'DELIVERED' || o.deliveryStatus === 'delivered'));
      for (const ord of codOrders) {
        const amt = Number(ord.totalAmount || ord.amount || 0);
        cashInHand += amt;
        const deliveredDate = ord.deliveredAt ? new Date(ord.deliveredAt) : (ord.updatedAt ? new Date(ord.updatedAt) : null);
        if (deliveredDate && deliveredDate >= todayStart) {
          collectedToday += amt;
        }
      }
    }

    return successResponse(res, 'Driver COD balance fetched successfully', {
      cashInHand,
      collectedToday,
      remitted: 0.00
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// 📍 Dynamic Driver Live GPS Location Update
export const updateDriverLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const driverPhone = req.user?.phone || req.body.phone || '';
    const driverId = req.user?.id || req.body.driverId || '';
    const cleanPhone = driverPhone.replace(/[^0-9]/g, '').slice(-10);

    const { Driver } = await import('../models/index.js');
    if (cleanPhone || driverId) {
      await Driver.findOneAndUpdate(
        cleanPhone ? { phone: new RegExp(cleanPhone, 'i') } : { id: driverId },
        {
          $set: {
            lastLatitude: latitude,
            lastLongitude: longitude,
            lastLocationUpdatedAt: new Date().toISOString()
          }
        }
      );
    }

    return successResponse(res, 'Driver location updated in database', { latitude, longitude });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// ⚡ Dynamic Driver Online / Offline Toggle
export const toggleDriverOnline = async (req, res) => {
  try {
    const { isOnline } = req.body;
    const driverPhone = req.user?.phone || req.body.phone || '';
    const driverId = req.user?.id || req.body.driverId || '';
    const cleanPhone = driverPhone.replace(/[^0-9]/g, '').slice(-10);

    const { Driver } = await import('../models/index.js');
    if (cleanPhone || driverId) {
      await Driver.findOneAndUpdate(
        cleanPhone ? { phone: new RegExp(cleanPhone, 'i') } : { id: driverId },
        {
          $set: {
            status: isOnline ? 'Active' : 'Offline',
            updatedAt: new Date().toISOString()
          }
        }
      );
    }

    return successResponse(res, `Driver status updated to ${isOnline ? 'Online' : 'Offline'}`, {
      isOnline: !!isOnline,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

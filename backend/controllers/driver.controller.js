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

import { Customer } from '../models/index.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { getDbStatus } from '../config/db.js';

export const listCustomers = async (req, res) => {
  try {
    if (!getDbStatus()) {
      return successResponse(res, 'Customers retrieved (Offline Mode)', { customers: [] });
    }

    const { city, status, search } = req.query;
    const filter = {};

    if (city && city !== 'All Cities' && city !== 'All') {
      filter.city = { $regex: city, $options: 'i' };
    }
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    return successResponse(res, 'Customers retrieved successfully', { customers, count: customers.length });
  } catch (err) {
    return errorResponse(res, `Failed to retrieve customers: ${err.message}`, 500);
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!getDbStatus()) {
      return errorResponse(res, 'Database is offline', 503);
    }

    const customer = await Customer.findOne({ $or: [{ id }, { _id: id }] });
    if (!customer) {
      return errorResponse(res, `Customer with ID ${id} not found`, 404);
    }

    return successResponse(res, 'Customer details retrieved', { customer });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const createCustomer = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.fullName || !payload.mobileNumber) {
      return errorResponse(res, 'fullName and mobileNumber are required', 400);
    }

    const customerId = payload.id || `RB-CUST-${Date.now().toString().slice(-6)}`;
    const newCustomer = {
      ...payload,
      id: customerId,
      status: payload.status || 'Verified',
      verificationStatus: payload.verificationStatus || 'Verified'
    };

    if (getDbStatus()) {
      const created = await Customer.findOneAndUpdate(
        { $or: [{ id: customerId }, { mobileNumber: payload.mobileNumber }] },
        newCustomer,
        { upsert: true, new: true }
      );
      return successResponse(res, 'Customer registered successfully', { customer: created }, 201);
    }

    return successResponse(res, 'Customer saved (Offline Mode)', { customer: newCustomer }, 201);
  } catch (err) {
    return errorResponse(res, `Failed to create customer: ${err.message}`, 400);
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (getDbStatus()) {
      const updated = await Customer.findOneAndUpdate(
        { $or: [{ id }, { _id: id }] },
        { $set: updates },
        { new: true }
      );
      if (!updated) {
        return errorResponse(res, `Customer ${id} not found`, 404);
      }
      return successResponse(res, 'Customer updated successfully', { customer: updated });
    }

    return successResponse(res, 'Customer updated (Offline Mode)', { customer: updates });
  } catch (err) {
    return errorResponse(res, err.message, 400);
  }
};

export const verifyCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus, status } = req.body;

    const updateFields = {};
    if (verificationStatus) updateFields.verificationStatus = verificationStatus;
    if (status) updateFields.status = status;

    if (getDbStatus()) {
      const updated = await Customer.findOneAndUpdate(
        { $or: [{ id }, { _id: id }] },
        { $set: updateFields },
        { new: true }
      );
      if (!updated) {
        return errorResponse(res, `Customer ${id} not found`, 404);
      }
      return successResponse(res, 'Customer verification status updated', { customer: updated });
    }

    return successResponse(res, 'Customer verification updated (Offline Mode)');
  } catch (err) {
    return errorResponse(res, err.message, 400);
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (getDbStatus()) {
      await Customer.findOneAndDelete({ $or: [{ id }, { _id: id }] });
      return successResponse(res, `Customer ${id} deleted successfully`);
    }
    return successResponse(res, `Customer ${id} deleted (Offline Mode)`);
  } catch (err) {
    return errorResponse(res, err.message, 400);
  }
};

import syncService from '../services/sync.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const loadState = async (req, res) => {
  try {
    const data = await syncService.loadAllState();
    return successResponse(res, 'Database state loaded', data);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const syncState = async (req, res) => {
  try {
    const message = await syncService.syncState(req.body);
    return successResponse(res, message);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

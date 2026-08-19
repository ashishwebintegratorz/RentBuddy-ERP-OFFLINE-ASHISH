import authService from '../services/auth.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const listUsers = async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    return successResponse(res, 'Users retrieved successfully', { users });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const createUser = async (req, res) => {
  try {
    const { username, password, fullName, role, city } = req.body;
    if (!username || !password || !fullName || !role || !city) {
      return errorResponse(res, 'All fields (username, password, fullName, role, city) are required', 400);
    }

    const created = await authService.createUser({ username, password, fullName, role, city });
    return successResponse(res, 'User created successfully', { user: created }, 201);
  } catch (err) {
    return errorResponse(res, err.message, 400);
  }
};

export const resetUserPassword = async (req, res) => {
  try {
    const { username } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string') {
      return errorResponse(res, 'New password string is required', 400);
    }

    await authService.resetPassword(username, newPassword);
    return successResponse(res, `Password for ${username} was reset successfully`);
  } catch (err) {
    return errorResponse(res, err.message, 400);
  }
};

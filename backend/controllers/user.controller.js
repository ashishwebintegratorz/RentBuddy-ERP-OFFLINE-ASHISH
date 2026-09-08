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
    const { username, password, fullName, role, city, permissions } = req.body;
    if (!username || !password || !fullName || !role || !city) {
      return errorResponse(res, 'All fields (username, password, fullName, role, city) are required', 400);
    }

    const created = await authService.createUser({ username, password, fullName, role, city, permissions });
    return successResponse(res, 'User created successfully', { user: created }, 201);
  } catch (err) {
    return errorResponse(res, err.message, 400);
  }
};

export const updateUserPermissions = async (req, res) => {
  try {
    const { username } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return errorResponse(res, 'Permissions must be an array of section keys', 400);
    }

    const updated = await authService.updateUserPermissions(username, permissions);
    return successResponse(res, `Permissions updated successfully for @${username}`, { user: updated });
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

export const deleteUser = async (req, res) => {
  try {
    const { username } = req.params;
    await authService.deleteUser(username);
    return successResponse(res, `User @${username} deleted successfully`);
  } catch (err) {
    return errorResponse(res, err.message, 400);
  }
};

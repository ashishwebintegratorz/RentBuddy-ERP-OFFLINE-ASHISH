import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants.js';
import { errorResponse } from '../utils/response.js';

/**
 * Verify JWT Token from Authorization header
 */
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || typeof token !== 'string') {
      return errorResponse(res, 'Authentication required. Missing Bearer token.', 401);
    }

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
      if (err) {
        return errorResponse(res, 'Session expired or invalid authentication token.', 403);
      }
      req.user = decoded;
      next();
    });
  } catch (err) {
    return errorResponse(res, 'Authentication processing failed.', 500);
  }
};

/**
 * Require Super Admin role
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Super Admin') {
    return errorResponse(res, 'Access denied: Super Admin privileges required.', 403);
  }
  next();
};

/**
 * Optional JWT Token verification (proceeds even if no token, populates req.user if valid)
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded;
      }
      next();
    });
  } catch (_) {
    next();
  }
};


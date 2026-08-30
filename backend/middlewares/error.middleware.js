import { errorResponse } from '../utils/response.js';
import { NODE_ENV } from '../config/constants.js';

/**
 * 404 Route Not Found handler
 */
export const notFoundHandler = (req, res) => {
  return errorResponse(res, `API route not found: [${req.method}] ${req.originalUrl}`, 404);
};

/**
 * Global Unhandled Error handler
 */
export const errorHandler = (err, req, res, next) => {
  // Log full stack trace securely on server logs only
  console.error(`🛡️ [RentBuddy Exception] [${req.method}] ${req.originalUrl} - ${err.message}`, err.stack);
  
  if (err.name === 'MulterError') {
    return errorResponse(res, `File upload validation failed: ${err.message}`, 400);
  }

  if (err.name === 'ValidationError') {
    return errorResponse(res, 'Request validation failed. Please check input parameters.', 400);
  }

  if (err.name === 'CastError') {
    return errorResponse(res, 'Invalid ID format provided.', 400);
  }

  const statusCode = err.statusCode || 500;
  const clientMessage = (NODE_ENV === 'production' && statusCode === 500)
    ? 'An unexpected internal server error occurred. Please try again later.'
    : (err.message || 'Internal Server Error');

  return errorResponse(res, clientMessage, statusCode);
};

import { errorResponse } from '../utils/response.js';

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
  console.error(`[Error] ${req.method} ${req.originalUrl} - ${err.message}`, err.stack);
  
  if (err.name === 'MulterError') {
    return errorResponse(res, `File upload error: ${err.message}`, 400);
  }

  return errorResponse(
    res,
    err.message || 'Internal Server Error',
    err.statusCode || 500
  );
};

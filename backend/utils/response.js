/**
 * Standardized API response format
 */
export const successResponse = (res, message = 'Success', data = null, statusCode = 200) => {
  const payload = { success: true, message };
  if (data !== null) {
    if (typeof data === 'object' && !Array.isArray(data)) {
      Object.assign(payload, data);
    } else {
      payload.data = data;
    }
  }
  return res.status(statusCode).json(payload);
};

export const errorResponse = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const payload = { success: false, message };
  if (errors) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
};

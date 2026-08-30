/**
 * RentBuddy Developer Security & NoSQL Injection Prevention Middleware
 * Recursively cleans user input in req.body, req.query, and req.params
 * to prevent MongoDB query selector injection (e.g. $where, $ne, $gt, $regex at root).
 */

const cleanInPlace = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    // Strip any keys starting with $ or containing a dot to prevent NoSQL operator injection
    if (key.startsWith('$') || key.includes('.')) {
      console.warn(`🛡️ [Security Sentinel] Blocked potentially unsafe NoSQL key "${key}" from request payload.`);
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      cleanInPlace(obj[key]);
    }
  }
};

export const sanitizeInputs = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      cleanInPlace(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      cleanInPlace(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      cleanInPlace(req.params);
    }
    next();
  } catch (err) {
    next(err);
  }
};

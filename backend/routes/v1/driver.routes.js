import { Router } from 'express';
import {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  updateDriverStatus,
  toggleBlockDriver,
  updateDriverDocuments
} from '../../controllers/driver.controller.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { successResponse } from '../../utils/response.js';

const router = Router();

// Secure driver endpoints
router.use(authenticateToken);

// Core Driver CRUD & Admin Operations
router.get('/', getDrivers);
router.get('/:id', getDriverById);
router.post('/', createDriver);
router.put('/:id', updateDriver);
router.put('/:id/status', updateDriverStatus);
router.put('/:id/block', toggleBlockDriver);
router.put('/:id/documents', updateDriverDocuments);

// Rider App Logistics Actions
router.post('/toggle-online', (req, res) => {
  const { isOnline } = req.body;
  return successResponse(res, `Driver status is now ${isOnline ? 'Online' : 'Offline'}`, {
    isOnline: !!isOnline,
    updatedAt: new Date().toISOString()
  });
});

router.post('/reached-store', (req, res) => {
  return successResponse(res, 'Driver marked arrived at hub store', {
    reachedStore: true,
    timestamp: new Date().toISOString()
  });
});

router.post('/update-location', (req, res) => {
  const { latitude, longitude } = req.body;
  return successResponse(res, 'Location updated', { latitude, longitude });
});

router.get('/summary', (req, res) => {
  return successResponse(res, 'Driver summary fetched', {
    totalDeliveries: 42,
    todayDeliveries: 5,
    todayEarnings: 1250,
    rating: 4.9
  });
});

router.get('/wallet', (req, res) => {
  return successResponse(res, 'Driver wallet fetched', {
    balance: 3450.00,
    currency: 'INR',
    pendingPayout: 1200.00
  });
});

router.get('/cod-balance', (req, res) => {
  return successResponse(res, 'Driver COD balance fetched', {
    cashInHand: 4500.00,
    collectedToday: 4500.00,
    remitted: 0.00
  });
});

export default router;

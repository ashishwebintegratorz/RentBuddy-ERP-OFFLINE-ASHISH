import { Router } from 'express';
import {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  updateDriverStatus,
  toggleBlockDriver,
  updateDriverDocuments,
  getDriverSummary,
  getDriverWallet,
  getDriverCodBalance,
  updateDriverLocation,
  toggleDriverOnline
} from '../../controllers/driver.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';
import { successResponse } from '../../utils/response.js';

const router = Router();

// Driver endpoints with flexible authentication
router.use(optionalAuth);

// Core Driver CRUD & Admin Operations
router.get('/', getDrivers);
router.get('/summary', getDriverSummary);
router.get('/wallet', getDriverWallet);
router.get('/cod-balance', getDriverCodBalance);
router.post('/toggle-online', toggleDriverOnline);
router.post('/update-location', updateDriverLocation);
router.post('/reached-store', (req, res) => {
  return successResponse(res, 'Driver marked arrived at hub store', {
    reachedStore: true,
    timestamp: new Date().toISOString()
  });
});

router.get('/:id', getDriverById);
router.post('/', createDriver);
router.put('/:id', updateDriver);
router.put('/:id/status', updateDriverStatus);
router.put('/:id/block', toggleBlockDriver);
router.put('/:id/documents', updateDriverDocuments);

export default router;

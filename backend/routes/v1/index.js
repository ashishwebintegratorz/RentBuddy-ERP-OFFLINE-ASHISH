import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import driverRoutes from './driver.routes.js';
import uploadRoutes from './upload.routes.js';
import syncRoutes from './sync.routes.js';
import otpRoutes from './otp.routes.js';
import orderRoutes from './order.routes.js';
import assetRoutes from './asset.routes.js';
import deliveryRoutes from './delivery.routes.js';
import damageRoutes from './damage.routes.js';

const router = Router();

// Version 1 Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'v1',
    service: 'RentBuddy Enterprise Logistics & ERP API',
    timestamp: new Date().toISOString()
  });
});

// Version 1 Submodules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/user', userRoutes); // Alias for Flutter Rider App endpoints like /user/me
router.use('/drivers', driverRoutes);
router.use('/driver', driverRoutes);
router.use('/upload', uploadRoutes);
router.use('/sync', syncRoutes);
router.use('/otp', otpRoutes);
router.use('/orders', orderRoutes);
router.use('/assets', assetRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/damage', damageRoutes);

export default router;

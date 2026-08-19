import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import driverRoutes from './driver.routes.js';
import uploadRoutes from './upload.routes.js';
import syncRoutes from './sync.routes.js';
import otpRoutes from './otp.routes.js';

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
router.use('/upload', uploadRoutes);
router.use('/sync', syncRoutes);
router.use('/otp', otpRoutes);

export default router;

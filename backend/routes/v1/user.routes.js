import { Router } from 'express';
import { listUsers, createUser, resetUserPassword } from '../../controllers/user.controller.js';
import { changeSelfPassword, getProfile } from '../../controllers/auth.controller.js';
import { authenticateToken, requireSuperAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

// Endpoint for current logged-in user profile & password
router.get('/me', authenticateToken, getProfile);
router.put('/self/password', authenticateToken, changeSelfPassword);

// All user management routes require Super Admin privileges
router.get('/', authenticateToken, requireSuperAdmin, listUsers);
router.post('/', authenticateToken, requireSuperAdmin, createUser);
router.put('/:username/password', authenticateToken, requireSuperAdmin, resetUserPassword);

export default router;

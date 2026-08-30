import { Router } from 'express';
import { loadState, syncState } from '../../controllers/sync.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

// ERP Database Synchronization Endpoints
// GET /api/v1/sync/load
router.get('/load', loadState);

// POST /api/v1/sync
router.post('/', optionalAuth, syncState);

export default router;

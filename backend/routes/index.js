import { Router } from 'express';
import v1Router from './v1/index.js';

const router = Router();

// API Gateway Info & Health Check
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    name: 'RentBuddy Enterprise Logistics & ERP API',
    defaultVersion: 'v1',
    availableVersions: ['v1'],
    documentation: '/api/v1/health'
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RentBuddy Enterprise Logistics & ERP API Gateway',
    timestamp: new Date().toISOString()
  });
});

// Primary Versioned Routes (/api/v1/...)
router.use('/v1', v1Router);

// Fallback Backward Compatibility Alias (/api/...)
router.use('/', v1Router);

export default router;

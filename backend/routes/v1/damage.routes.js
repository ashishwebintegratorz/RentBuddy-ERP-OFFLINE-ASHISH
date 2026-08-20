import express from 'express';
import {
  reportDamage,
  getDamageReports,
  resolveDamageReport
} from '../../controllers/damage.controller.js';

const router = express.Router();

router.post('/report', reportDamage);
router.get('/reports', getDamageReports);
router.patch('/reports/:id/resolve', resolveDamageReport);

export default router;

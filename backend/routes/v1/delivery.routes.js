import express from 'express';
import {
  uploadDeliveryProof,
  completeDelivery,
  submitFeedback
} from '../../controllers/delivery.controller.js';

const router = express.Router();

router.post('/proof', uploadDeliveryProof);
router.post('/complete', completeDelivery);
router.post('/feedback', submitFeedback);

export default router;

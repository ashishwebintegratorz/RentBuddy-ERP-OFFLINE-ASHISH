import express from 'express';
import {
  sendDeliveryOtp,
  uploadDeliveryProof,
  completeDelivery,
  submitFeedback
} from '../../controllers/delivery.controller.js';

const router = express.Router();

router.post('/send-otp', sendDeliveryOtp);
router.post('/send-delivery-otp', sendDeliveryOtp);
router.post('/otp', sendDeliveryOtp);
router.post('/proof', uploadDeliveryProof);
router.post('/complete', completeDelivery);
router.post('/feedback', submitFeedback);

export default router;

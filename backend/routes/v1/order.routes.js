import express from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  assignDriverToOrder,
  getDriverActiveOrders,
  getDriverOrderHistory
} from '../../controllers/order.controller.js';

const router = express.Router();

router.get('/', getOrders);
router.get('/driver/active', getDriverActiveOrders);
router.get('/driver/history', getDriverOrderHistory);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.post('/:id/assign-driver', assignDriverToOrder);

export default router;

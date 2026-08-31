import express from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  prepareOrder,
  assignDriverToOrder,
  scanAssetBarcode,
  acceptOrder,
  updateOrderStatus,
  getDriverActiveOrders,
  getDriverOrderHistory,
  cancelOrder,
  requestReturnDeposit,
  acceptReturnDeposit
} from '../../controllers/order.controller.js';

const router = express.Router();

router.get('/', getOrders);
router.get('/driver/active', getDriverActiveOrders);
router.get('/driver/history', getDriverOrderHistory);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.put('/:id/prepare', prepareOrder);
router.post('/:id/assign-driver', assignDriverToOrder);
router.post('/:id/scan-asset', scanAssetBarcode);
router.post('/:id/cancel', cancelOrder);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/accept', acceptOrder);
router.post('/:id/accept', acceptOrder);
router.put('/:id/status', updateOrderStatus);
router.post('/:id/request-return-deposit', requestReturnDeposit);
router.post('/:id/accept-return-deposit', acceptReturnDeposit);

export default router;

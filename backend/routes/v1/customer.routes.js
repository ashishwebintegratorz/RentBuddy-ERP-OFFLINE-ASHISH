import { Router } from 'express';
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  verifyCustomer,
  deleteCustomer
} from '../../controllers/customer.controller.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';

const router = Router();

// Routes
router.get('/', authenticateToken, listCustomers);
router.get('/:id', authenticateToken, getCustomerById);
router.post('/', authenticateToken, createCustomer);
router.put('/:id', authenticateToken, updateCustomer);
router.put('/:id/verify', authenticateToken, verifyCustomer);
router.delete('/:id', authenticateToken, deleteCustomer);

export default router;

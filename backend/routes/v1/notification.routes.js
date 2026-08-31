import express from 'express';
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
  clearAllNotifications,
  deleteNotification
} from '../../controllers/notification.controller.js';

const router = express.Router();

router.get('/', getNotifications);
router.put('/mark-all-read', markAllAsRead);
router.patch('/mark-all-read', markAllAsRead);
router.put('/:id/read', markAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/clear-all', clearAllNotifications);
router.delete('/', clearAllNotifications);
router.delete('/:id', deleteNotification);

export default router;

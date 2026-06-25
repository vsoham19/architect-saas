import express from 'express';
import { 
  getNotifications, createNotification, 
  markNotificationRead, markAllNotificationsRead 
} from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', getNotifications);
router.post('/', createNotification);
router.patch('/:id/read', markNotificationRead);
router.patch('/read-all', markAllNotificationsRead);

export default router;

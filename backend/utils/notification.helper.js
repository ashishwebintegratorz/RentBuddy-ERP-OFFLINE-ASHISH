import { Notif } from '../models/index.js';

export const addNotification = async ({
  title,
  message,
  type = 'info',
  city = 'Indore (Head Office)',
  riderName = '',
  riderPhone = '',
  orderId = '',
  category = 'system'
}) => {
  try {
    const notif = new Notif({
      id: `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      message,
      type,
      city,
      riderName,
      riderPhone,
      orderId,
      category,
      read: false,
      timestamp: new Date().toISOString()
    });

    await notif.save();
    console.log(`🔔 [Notification] ${title}: ${message}`);
    return notif;
  } catch (error) {
    console.error('Error saving notification:', error.message);
    return null;
  }
};

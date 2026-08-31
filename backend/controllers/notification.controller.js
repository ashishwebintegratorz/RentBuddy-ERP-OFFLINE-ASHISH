import { Notif } from '../models/index.js';

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notif.find({}).sort({ timestamp: -1, createdAt: -1 }).limit(100);
    return res.json({ success: true, data: notifications, count: notifications.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notif.updateMany({}, { $set: { read: true } });
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notif.findOneAndUpdate(
      { $or: [{ id }, { _id: id.length === 24 ? id : undefined }].filter(Boolean) },
      { $set: { read: true } }
    );
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const clearAllNotifications = async (req, res) => {
  try {
    await Notif.deleteMany({});
    return res.json({ success: true, message: 'All notifications cleared.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notif.findOneAndDelete({
      $or: [{ id }, { _id: id.length === 24 ? id : undefined }].filter(Boolean)
    });
    return res.json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

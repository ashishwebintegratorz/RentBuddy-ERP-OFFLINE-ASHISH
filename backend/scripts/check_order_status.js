import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { Order, Notif } from '../models/index.js';

async function check() {
  await connectDB();
  const order = await Order.findOne({ $or: [{ id: /931583/i }, { id: 'RB-ORD-931583' }] });
  console.log('Order 931583 in DB:', order ? { id: order.id, status: order.status, deliveryStatus: order.deliveryStatus } : 'NOT FOUND');
  
  const notifCount = await Notif.countDocuments({});
  console.log('Total Notifs in DB:', notifCount);
  process.exit(0);
}

check();

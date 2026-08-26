import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ashishwebintegratorz:qwe123rty456@rentbuddycluster.w3u6u.mongodb.net/rentbuddy?retryWrites=true&w=majority';

async function run() {
  console.log('Connecting to MongoDB Atlas at:', MONGODB_URI.split('@')[1]);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to Atlas.');

  const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
  const orders = await Order.find({});
  console.log(`Found ${orders.length} orders. Backfilling city & address...`);

  for (const o of orders) {
    let city = o.get('city');
    let addr = o.get('deliveryAddress');
    const cust = (o.get('customerName') || '').toLowerCase();

    if (cust.includes('rahul')) {
      city = 'Indore (Head Office)';
      addr = addr || 'Flat 402, Lotus Pride, Vijay Nagar, Indore';
    } else if (cust.includes('priya')) {
      city = 'Surat';
      addr = addr || 'B-12, Vesu Royal Homes, Vesu, Surat';
    } else if (cust.includes('amitabh')) {
      city = 'Bhopal';
      addr = addr || '15, Arera Colony, Near Bittan Market, Bhopal';
    } else if (cust.includes('ananya')) {
      city = 'Ahmedabad';
      addr = addr || 'Tower 3, Prahlad Nagar Highs, Ahmedabad';
    } else if (!city) {
      city = 'Indore (Head Office)';
      addr = addr || 'Scheme 54, Vijay Nagar, Indore';
    }

    await Order.updateOne(
      { _id: o._id },
      { $set: { city, deliveryAddress: addr } }
    );
    console.log(`✅ Order ${o.get('id')} (${o.get('customerName')}) -> City: "${city}"`);
  }

  console.log('🎉 Successfully synchronized all order city hubs in MongoDB Atlas!');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

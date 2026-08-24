import mongoose from 'mongoose';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;
const targetPhone = process.argv[2] || process.env.TARGET_PHONE;

async function clearDriver() {
  if (!uri) {
    console.error("❌ MONGODB_URI environment variable is required.");
    process.exit(1);
  }
  if (!targetPhone) {
    console.error("❌ Target phone number is required (pass as argument: node clear_test_driver.js <phone>).");
    process.exit(1);
  }

  const cleanPhone = targetPhone.replace(/[^0-9]/g, '').slice(-10);

  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB Atlas!");
    
    const Driver = mongoose.model('Driver', new mongoose.Schema({}, { strict: false }));
    const res = await Driver.deleteMany({
      $or: [
        { phone: cleanPhone },
        { phone: `+91${cleanPhone}` },
        { phone: { $regex: cleanPhone } }
      ]
    });
    console.log(`✅ Deleted ${res.deletedCount} driver record(s) matching phone ${cleanPhone}.`);
    
    await mongoose.disconnect();
  } catch (e) {
    console.error("Operation failed:", e.message);
  }
}

clearDriver();

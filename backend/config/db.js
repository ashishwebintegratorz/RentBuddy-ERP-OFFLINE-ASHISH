import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { DEFAULT_ADMIN } from './constants.js';

let isMongoConnected = false;

export const getDbStatus = () => isMongoConnected || mongoose.connection.readyState === 1;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: MONGODB_URI environment variable is required in production.');
    }
    console.warn("⚠️ [DB] No MONGODB_URI configured. Operating in Local Offline Cache Fallback mode.");
    isMongoConnected = false;
    return false;
  }

  try {
    console.log(`[DB] Connecting to MongoDB Atlas...`);
    await mongoose.connect(uri);
    isMongoConnected = true;
    console.log("✅ [DB] MongoDB Atlas connected successfully!");
    return true;
  } catch (err) {
    const masked = uri.replace(/:([^@]+)@/, ':****@');
    console.error(`⚠️ [DB] Connection failed with URI (${masked}): ${err.message}`);
    isMongoConnected = false;
    return false;
  }
}

export async function seedAdminUser(UserModel) {
  try {
    if (!isMongoConnected) return;

    const adminExists = await UserModel.findOne({ username: DEFAULT_ADMIN.username });
    if (!adminExists) {
      console.log("[DB] No administrator account found. Seeding default Admin user...");
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
      await UserModel.create({
        username: DEFAULT_ADMIN.username,
        password: hashedPassword,
        fullName: DEFAULT_ADMIN.fullName,
        role: DEFAULT_ADMIN.role,
        city: DEFAULT_ADMIN.city
      });
      console.log("------------------------------------------------------------------");
      console.log("ADMIN ACCOUNT SEEDED:");
      console.log(`Username: ${DEFAULT_ADMIN.username}`);
      console.log(`Password: ${DEFAULT_ADMIN.password}`);
      console.log("------------------------------------------------------------------");
    }
  } catch (err) {
    console.error("❌ [DB] Failed to seed administrator account:", err.message);
  }
}

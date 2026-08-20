import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { DEFAULT_ADMIN } from './constants.js';

let isMongoConnected = false;

export const getDbStatus = () => isMongoConnected || mongoose.connection.readyState === 1;

export async function connectDB() {
  const uris = [
    process.env.MONGODB_URI,
    "mongodb+srv://rentbuddycdn_db_user:2.%235MGfpypAUi7j@cluster0.nkhra1f.mongodb.net/?appName=Cluster0",
    "mongodb+srv://rentbuddycdn_db_user:BweRMlXdm4ngDbi2@cluster0.nkhra1f.mongodb.net/?appName=Cluster0"
  ].filter(Boolean);

  for (const uri of uris) {
    try {
      console.log(`[DB] Connecting to MongoDB Atlas...`);
      await mongoose.connect(uri);
      isMongoConnected = true;
      console.log("✅ [DB] MongoDB Atlas connected successfully!");
      return true;
    } catch (err) {
      console.error(`⚠️ [DB] Connection failed with URI (${uri.replace(/:([^@]+)@/, ':****@')}): ${err.message}`);
    }
  }

  isMongoConnected = false;
  console.warn("⚠️ [DB] Could not connect to MongoDB Atlas. Operating in Local Offline Cache Fallback mode.");
  return false;
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

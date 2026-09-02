import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;
const adminUsername = process.env.INITIAL_ADMIN_USERNAME || process.argv[2] || 'admin';
const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || process.argv[3];
const adminFullName = process.env.INITIAL_ADMIN_NAME || 'RentBuddy Administrator';

async function seedAdmin() {
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is required.');
    process.exit(1);
  }
  if (!adminPassword) {
    console.error('❌ Admin password must be provided via INITIAL_ADMIN_PASSWORD env variable or CLI argument (node seed_admin.js <username> <password>).');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas!');

    const UserSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      fullName: { type: String },
      role: { type: String, default: 'Super Admin' },
      city: { type: String, default: 'Indore (Head Office)' }
    });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const admin = await User.findOneAndUpdate(
      { username: adminUsername },
      {
        username: adminUsername,
        password: hashedPassword,
        fullName: adminFullName,
        role: 'Super Admin',
        city: 'Indore (Head Office)'
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`[Seed] Admin user (${adminUsername}) successfully configured.`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Failed to configure admin:', err.message);
    process.exit(1);
  }
}

seedAdmin();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const uri = process.env.MONGODB_URI || 'mongodb+srv://rentbuddycdn_db_user:q3D4hcfyUhsNBSVu@cluster0.nkhra1f.mongodb.net/?appName=Cluster0';

async function seedAdmin() {
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

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.findOneAndUpdate(
      { username: 'admin' },
      {
        username: 'admin',
        password: hashedPassword,
        fullName: 'Ashish Admin (Super Admin)',
        role: 'Super Admin',
        city: 'Indore (Head Office)'
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log('======================================================');
    console.log('✅ Admin Account Configured in MongoDB Atlas:');
    console.log('👤 Username : admin');
    console.log('🔑 Password : admin123');
    console.log('🛡️  Role     : Super Admin');
    console.log('🏙️  City     : Indore (Head Office)');
    console.log('======================================================');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Failed to configure admin:', err.message);
    process.exit(1);
  }
}

seedAdmin();

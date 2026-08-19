import mongoose from 'mongoose';
import 'dotenv/config';

const uris = [
  process.env.MONGODB_URI,
  "mongodb+srv://rentbuddycdn_db_user:2.%235MGfpypAUi7j@cluster0.nkhra1f.mongodb.net/?appName=Cluster0",
  "mongodb+srv://rentbuddycdn_db_user:BweRMlXdm4ngDbi2@cluster0.nkhra1f.mongodb.net/?appName=Cluster0"
].filter(Boolean);

async function clearDriver() {
  for (const uri of uris) {
    try {
      console.log("Connecting to Mongo...");
      await mongoose.connect(uri);
      console.log("Connected to MongoDB!");
      
      const Driver = mongoose.model('Driver', new mongoose.Schema({}, { strict: false }));
      const res = await Driver.deleteMany({ phone: { $in: ['7008452720', '+917008452720', '917008452720'] } });
      console.log(`Deleted ${res.deletedCount} driver test records with phone 7008452720.`);
      
      await mongoose.disconnect();
      return;
    } catch (e) {
      console.error("Connection failed on uri:", e.message);
    }
  }
}

clearDriver();

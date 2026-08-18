import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_rentbuddy_2026_!!';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Brute-force protection: Limit login attempts to 5 requests per minute
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts. Please try again after 60 seconds.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mongoose Schemas
const AssetSchema = new mongoose.Schema({ id: String, barcode: String, qrCode: String, category: String, brand: String, model: String, purchaseDate: String, purchaseCost: Number, currentValue: Number, securityDeposit: Number, monthlyRentalPrice: Number, warehouse: String, city: String, rackNumber: String, status: String, lifecycle: Object, imageUrl: String }, { strict: false });
const CustomerSchema = new mongoose.Schema({ id: String, fullName: String, mobileNumber: String, alternateNumber: String, email: String, aadhaarNumber: String, panNumber: String, occupation: String, employer: String, monthlyIncome: Number, currentAddress: String, permanentAddress: String, landmark: String, gpsLocation: String, deliveryAddress: String, billingAddress: String, landlordName: String, landlordMobile: String, landlordId: String, status: String, verificationStatus: String, documents: Object, createdAt: String }, { strict: false });
const OrderSchema = new mongoose.Schema({ id: String, customerId: String, customerName: String, customerMobile: String, items: Array, durationMonths: Number, startDate: String, endDate: String, totalDeposit: Number, totalMonthlyRent: Number, discountAmount: Number, discountType: String, discountValue: Number, netMonthlyRent: Number, status: String, assignedLogisticsUser: String, scannedAtLoading: Boolean, scannedAtDelivery: Boolean, scannedAtPickup: Boolean, scannedAtWarehouseEntry: Boolean, depositRefundStatus: String, depositDeductions: Number, createdAt: String }, { strict: false });
const InvoiceSchema = new mongoose.Schema({ id: String, orderId: String, customerId: String, customerName: String, billingPeriod: String, dueDate: String, depositAmount: Number, rentalCharges: Number, lateFee: Number, discount: Number, discountType: String, discountValue: Number, couponCode: String, totalAmount: Number, status: String, paymentDate: String, paymentMethod: String, createdAt: String }, { strict: false });
const RepairSchema = new mongoose.Schema({ id: String, assetId: String, assetBarcode: String, assetName: String, repairCost: Number, vendor: String, technician: String, repairTimeDays: Number, warrantyMonths: Number, photos: Array, status: String, createdAt: String, completedAt: String }, { strict: false });
const LogSchema = new mongoose.Schema({ id: String, timestamp: String, userRole: String, userName: String, city: String, action: String, category: String, severity: String, details: String }, { strict: false });
const NotifSchema = new mongoose.Schema({ id: String, title: String, message: String, type: String, timestamp: String, read: Boolean, city: String }, { strict: false });
const ConfigSchema = new mongoose.Schema({ key: String, value: mongoose.Schema.Types.Mixed });
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { type: String, required: true },
  city: { type: String, required: true }
});

const DriverSchema = new mongoose.Schema({ id: String, fullName: String, phone: String, alternatePhone: String, email: String, city: String, vehicleType: String, vehicleNumber: String, status: String, verificationStatus: String, joiningDate: String, totalDelivered: Number, pendingDeliveries: Number, deadlineOverdue: Number, rating: Number, documents: Object, isBlocked: Boolean, blockedReason: String, verificationNotes: String, createdAt: String }, { strict: false });

// Mongoose Models
const Asset = mongoose.model('Asset', AssetSchema);
const Customer = mongoose.model('Customer', CustomerSchema);
const Order = mongoose.model('Order', OrderSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const Repair = mongoose.model('Repair', RepairSchema);
const Log = mongoose.model('Log', LogSchema);
const Notif = mongoose.model('Notif', NotifSchema);
const Config = mongoose.model('Config', ConfigSchema);
const User = mongoose.model('User', UserSchema);
const Driver = mongoose.model('Driver', DriverSchema);

// Connection logic with credentials failover
async function connectDB() {
  const uris = [
    process.env.MONGODB_URI,
    "mongodb+srv://rentbuddycdn_db_user:2.%235MGfpypAUi7j@cluster0.nkhra1f.mongodb.net/?appName=Cluster0",
    "mongodb+srv://rentbuddycdn_db_user:BweRMlXdm4ngDbi2@cluster0.nkhra1f.mongodb.net/?appName=Cluster0"
  ].filter(Boolean);

  for (const uri of uris) {
    try {
      console.log(`Connecting to MongoDB Atlas...`);
      await mongoose.connect(uri);
      console.log("MongoDB connected successfully!");
      return;
    } catch (err) {
      console.error(`Failed to connect with URI: ${uri.replace(/:([^@]+)@/, ':****@')}. Error: ${err.message}`);
    }
  }
  throw new Error("Could not connect to MongoDB Atlas with any of the credentials.");
}

async function seedAdminUser() {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      console.log("No administrator account found. Seeding default Admin user...");
      const hashedPassword = await bcrypt.hash('RentbuddySecure2026!', 12);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        fullName: 'Ashish Admin',
        role: 'Super Admin',
        city: 'Indore (Head Office)'
      });
      console.log("------------------------------------------------------------------");
      console.log("ADMIN ACCOUNT SEEDED:");
      console.log("Username: admin");
      console.log("Password: RentbuddySecure2026!");
      console.log("------------------------------------------------------------------");
    }
  } catch (err) {
    console.error("Failed to seed administrator account:", err.message);
  }
}

let isMongoConnected = false;

// Connect to MongoDB Atlas
connectDB()
  .then(() => {
    isMongoConnected = true;
    return seedAdminUser();
  })
  .catch(err => {
    console.warn("⚠️ Warning: MongoDB Atlas Connection Error:", err.message);
    console.warn("Express server will remain active. Running in Local Offline Cache Fallback mode.");
  });

// Authenticate JWT Token middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Session expired or invalid token' });
      }
      req.user = decoded;
      next();
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

// APIs
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid request format' });
    }

    const genericError = 'Invalid username or password';

    // Fallback to local admin credentials if MongoDB Atlas is offline or restricted by IP
    if (!isMongoConnected) {
      if (username.toLowerCase().trim() === 'admin' && password === 'RentbuddySecure2026!') {
        const token = jwt.sign(
          { userId: 'local-admin-id', username: 'admin', role: 'Super Admin', city: 'Indore (Head Office)' },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        return res.json({
          success: true,
          token,
          user: {
            username: 'admin',
            fullName: 'Ashish Admin (Offline)',
            role: 'Super Admin',
            city: 'Indore (Head Office)'
          }
        });
      } else {
        return res.status(401).json({ success: false, message: genericError });
      }
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: genericError });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: genericError });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role, city: user.city },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        city: user.city
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/load', authenticateToken, async (req, res) => {
  try {
    if (!isMongoConnected) {
      return res.json({ success: true, data: null });
    }
    const assets = await Asset.find({});
    const customers = await Customer.find({});
    const orders = await Order.find({});
    const invoices = await Invoice.find({});
    const repairs = await Repair.find({});
    const logs = await Log.find({});
    const notifications = await Notif.find({});
    const drivers = await Driver.find({});
    
    // Config values
    const citiesConfig = await Config.findOne({ key: 'cities' });
    const currentCityConfig = await Config.findOne({ key: 'currentCity' });
    const currentUserRoleConfig = await Config.findOne({ key: 'currentUserRole' });
    const expectedVsActualAuditConfig = await Config.findOne({ key: 'expectedVsActualAudit' });

    res.json({
      success: true,
      data: {
        assets: assets || [],
        customers: customers || [],
        orders: orders || [],
        invoices: invoices || [],
        repairs: repairs || [],
        auditLogs: logs || [],
        notifications: notifications || [],
        drivers: drivers || [],
        cities: citiesConfig ? citiesConfig.value : null,
        currentCity: currentCityConfig ? currentCityConfig.value : null,
        currentUserRole: currentUserRoleConfig ? currentUserRoleConfig.value : null,
        expectedVsActualAudit: expectedVsActualAuditConfig ? expectedVsActualAuditConfig.value : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/sync', authenticateToken, async (req, res) => {
  try {
    if (!isMongoConnected) {
      return res.json({ success: true, message: 'Offline cache mode active.' });
    }
    const {
      assets,
      customers,
      orders,
      invoices,
      repairs,
      auditLogs,
      notifications,
      drivers,
      cities,
      currentCity,
      currentUserRole,
      expectedVsActualAudit
    } = req.body;

    // Overwrite data tables
    if (assets) {
      await Asset.deleteMany({});
      if (assets.length > 0) await Asset.insertMany(assets);
    }
    if (customers) {
      await Customer.deleteMany({});
      if (customers.length > 0) await Customer.insertMany(customers);
    }
    if (orders) {
      await Order.deleteMany({});
      if (orders.length > 0) await Order.insertMany(orders);
    }
    if (invoices) {
      await Invoice.deleteMany({});
      if (invoices.length > 0) await Invoice.insertMany(invoices);
    }
    if (repairs) {
      await Repair.deleteMany({});
      if (repairs.length > 0) await Repair.insertMany(repairs);
    }
    if (auditLogs) {
      await Log.deleteMany({});
      if (auditLogs.length > 0) await Log.insertMany(auditLogs);
    }
    if (notifications) {
      await Notif.deleteMany({});
      if (notifications.length > 0) await Notif.insertMany(notifications);
    }
    if (drivers) {
      await Driver.deleteMany({});
      if (drivers.length > 0) await Driver.insertMany(drivers);
    }

    // Update config keys
    if (cities) {
      await Config.findOneAndUpdate({ key: 'cities' }, { value: cities }, { upsert: true });
    }
    if (currentCity) {
      await Config.findOneAndUpdate({ key: 'currentCity' }, { value: currentCity }, { upsert: true });
    }
    if (currentUserRole) {
      await Config.findOneAndUpdate({ key: 'currentUserRole' }, { value: currentUserRole }, { upsert: true });
    }
    if (expectedVsActualAudit) {
      await Config.findOneAndUpdate({ key: 'expectedVsActualAudit' }, { value: expectedVsActualAudit }, { upsert: true });
    }

    res.json({ success: true, message: 'Database state synchronized successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// Logistics Driver & Documents REST API
// ==========================================
app.get('/api/logistics/drivers', authenticateToken, async (req, res) => {
  try {
    if (!isMongoConnected) {
      return res.json({ success: true, drivers: [] });
    }
    const drivers = await Driver.find({});
    res.json({ success: true, drivers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/logistics/drivers', authenticateToken, async (req, res) => {
  try {
    const driverData = req.body;
    if (!driverData.fullName || !driverData.phone) {
      return res.status(400).json({ success: false, message: 'Full name and phone are required' });
    }
    if (isMongoConnected) {
      const driver = new Driver(driverData);
      await driver.save();
    }
    res.json({ success: true, message: 'Driver onboarded successfully', driver: driverData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/logistics/drivers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (isMongoConnected) {
      await Driver.findOneAndUpdate({ id }, { $set: updates }, { upsert: true });
    }
    res.json({ success: true, message: 'Driver updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/logistics/drivers/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verificationStatus, verificationNotes } = req.body;
    if (isMongoConnected) {
      await Driver.findOneAndUpdate(
        { id },
        { $set: { status, verificationStatus, verificationNotes } }
      );
    }
    res.json({ success: true, message: 'Driver status updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/logistics/drivers/:id/block', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked, blockedReason } = req.body;
    if (isMongoConnected) {
      await Driver.findOneAndUpdate(
        { id },
        { 
          $set: { 
            isBlocked, 
            blockedReason: isBlocked ? blockedReason : '', 
            status: isBlocked ? 'Blocked' : 'Active' 
          } 
        }
      );
    }
    res.json({ success: true, message: isBlocked ? 'Driver blocked' : 'Driver unblocked' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/logistics/drivers/:id/documents', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { documents } = req.body;
    if (isMongoConnected) {
      await Driver.findOneAndUpdate({ id }, { $set: { documents } });
    }
    res.json({ success: true, message: 'Driver documents updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET all users (Super Admin only)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
    }

    if (!isMongoConnected) {
      // Offline fallback: Return a simulated list of users
      return res.json({
        success: true,
        users: [
          { username: 'admin', fullName: 'Ashish Admin', role: 'Super Admin', city: 'Indore (Head Office)', createdAt: new Date().toISOString() }
        ]
      });
    }

    const users = await User.find({}, '-password'); // Exclude password hashes
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create new user (Super Admin only)
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
    }

    const { username, password, fullName, role, city } = req.body;
    if (!username || !password || !fullName || !role || !city) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!isMongoConnected) {
      return res.json({ success: true, message: 'User simulated created (Offline Fallback)' });
    }

    const userExists = await User.findOne({ username: username.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
      username: username.toLowerCase().trim(),
      password: hashedPassword,
      fullName,
      role,
      city
    });

    res.json({ success: true, message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT reset another user's password (Super Admin only)
app.put('/api/users/:username/password', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
    }

    const { newPassword } = req.body;
    const targetUsername = req.params.username;

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }

    if (!isMongoConnected) {
      return res.json({ success: true, message: `Password reset successfully for ${targetUsername} (Offline Fallback)` });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const updatedUser = await User.findOneAndUpdate(
      { username: targetUsername.toLowerCase().trim() },
      { password: hashedPassword }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT change self password (any logged-in user)
app.put('/api/users/self/password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const username = req.user.username;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Old and new passwords are required' });
    }

    if (!isMongoConnected) {
      if (oldPassword === 'RentbuddySecure2026!') {
        return res.json({ success: true, message: 'Password updated successfully (Offline Fallback)' });
      } else {
        return res.status(400).json({ success: false, message: 'Incorrect old password (Offline Fallback)' });
      }
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect old password' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ success: true, message: 'Your password has been changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Fallback error route
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

app.listen(PORT, () => {
  console.log(`RentBuddy Server running on port ${PORT}`);
});

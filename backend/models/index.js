import mongoose from 'mongoose';

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { type: String, required: true },
  city: { type: String, required: true }
}, { timestamps: true });

// Driver Schema (Fleet & Logistics)
const DriverSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  alternatePhone: String,
  email: String,
  city: String,
  vehicleType: String,
  vehicleNumber: String,
  status: { type: String, default: 'Active' },
  verificationStatus: { type: String, default: 'Pending' },
  joiningDate: String,
  totalDelivered: { type: Number, default: 0 },
  pendingDeliveries: { type: Number, default: 0 },
  deadlineOverdue: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0 },
  documents: {
    aadhaarFront: String,
    aadhaarBack: String,
    licenseFront: String,
    licenseBack: String,
    panCard: String,
    vehicleRc: String,
    selfiePhoto: String,
    agreementPdf: String
  },
  isBlocked: { type: Boolean, default: false },
  blockedReason: { type: String, default: '' },
  verificationNotes: { type: String, default: '' },
  fcmToken: String,
  pin: { type: String, default: null },
  hasPin: { type: Boolean, default: false },
  currentLocation: {
    lat: Number,
    lng: Number,
    lastUpdated: String
  }
}, { strict: false, timestamps: true });

// Customer Schema
const CustomerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  fullName: String,
  mobileNumber: String,
  alternateNumber: String,
  email: String,
  aadhaarNumber: String,
  panNumber: String,
  occupation: String,
  employer: String,
  monthlyIncome: Number,
  currentAddress: String,
  permanentAddress: String,
  landmark: String,
  gpsLocation: String,
  deliveryAddress: String,
  billingAddress: String,
  landlordName: String,
  landlordMobile: String,
  landlordId: String,
  status: String,
  verificationStatus: String,
  documents: Object
}, { strict: false, timestamps: true });

// Asset / Inventory Schema
const AssetSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  barcode: String,
  qrCode: String,
  category: String,
  brand: String,
  model: String,
  purchaseDate: String,
  purchaseCost: Number,
  currentValue: Number,
  securityDeposit: Number,
  monthlyRentalPrice: Number,
  warehouse: String,
  city: String,
  rackNumber: String,
  status: String,
  lifecycle: Object,
  imageUrl: String
}, { strict: false, timestamps: true });

// Order Schema
const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  customerId: String,
  customerName: String,
  customerMobile: String,
  items: Array,
  durationMonths: Number,
  startDate: String,
  endDate: String,
  totalDeposit: Number,
  totalMonthlyRent: Number,
  discountAmount: Number,
  discountType: String,
  discountValue: Number,
  netMonthlyRent: Number,
  status: String,
  assignedLogisticsUser: String,
  scannedAtLoading: Boolean,
  scannedAtDelivery: Boolean,
  scannedAtPickup: Boolean,
  scannedAtWarehouseEntry: Boolean,
  depositRefundStatus: String,
  depositDeductions: Number
}, { strict: false, timestamps: true });

// Invoice Schema
const InvoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  orderId: String,
  customerId: String,
  customerName: String,
  billingPeriod: String,
  dueDate: String,
  depositAmount: Number,
  rentalCharges: Number,
  lateFee: Number,
  discount: Number,
  discountType: String,
  discountValue: Number,
  couponCode: String,
  totalAmount: Number,
  status: String,
  paymentDate: String,
  paymentMethod: String
}, { strict: false, timestamps: true });

// Repair Schema
const RepairSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  assetId: String,
  assetBarcode: String,
  assetName: String,
  repairCost: Number,
  vendor: String,
  technician: String,
  repairTimeDays: Number,
  warrantyMonths: Number,
  photos: Array,
  status: String,
  completedAt: String
}, { strict: false, timestamps: true });

// Audit Log Schema
const LogSchema = new mongoose.Schema({
  id: String,
  timestamp: String,
  userRole: String,
  userName: String,
  city: String,
  action: String,
  category: String,
  severity: String,
  details: String
}, { strict: false, timestamps: true });

// Notifications Schema
const NotifSchema = new mongoose.Schema({
  id: String,
  title: String,
  message: String,
  type: String,
  timestamp: String,
  read: { type: Boolean, default: false },
  city: String
}, { strict: false, timestamps: true });

// Config Schema
const ConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
export const Driver = mongoose.model('Driver', DriverSchema);
export const Customer = mongoose.model('Customer', CustomerSchema);
export const Asset = mongoose.model('Asset', AssetSchema);
export const Order = mongoose.model('Order', OrderSchema);
export const Invoice = mongoose.model('Invoice', InvoiceSchema);
export const Repair = mongoose.model('Repair', RepairSchema);
export const Log = mongoose.model('Log', LogSchema);
export const Notif = mongoose.model('Notif', NotifSchema);
export const Config = mongoose.model('Config', ConfigSchema);

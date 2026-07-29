export type UserRole =
  | 'Super Admin'
  | 'Operations Manager'
  | 'Warehouse Manager'
  | 'Logistics Team'
  | 'Repair Team'
  | 'Finance'
  | 'Customer Support'
  | 'Read-only Auditor';

export type CityName = string;

export type CustomerStatus = 'Good Customer' | 'Verified' | 'VIP' | 'Defaulter' | 'High Risk' | 'Blacklisted';

export type VerificationStatus = 'Pending' | 'Verified' | 'Rejected';

export type AssetStatus = 'Available' | 'Reserved' | 'Rented' | 'Under Repair' | 'Lost' | 'Scrapped';

export type OrderStatus =
  | 'Pending'
  | 'Assigned'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Return Pickup'
  | 'Returned'
  | 'Completed';

export type InspectionResult = 'Excellent' | 'Minor Repair' | 'Major Repair' | 'Scrap';

export type ComplaintStatus = 'Pending' | 'Assigned' | 'Resolved';

export interface CustomerDocuments {
  aadhaarFront: string; // URL or Base64 or mock indicator
  aadhaarBack: string;
  panCard: string;
  rentAgreement: string;
  passport?: string;
  drivingLicense?: string;
  selfie: string;
}

export interface Customer {
  id: string;
  fullName: string;
  mobileNumber: string;
  alternateNumber: string;
  email: string;
  aadhaarNumber: string;
  panNumber: string;
  occupation: string;
  employer: string;
  monthlyIncome: number;
  currentAddress: string;
  permanentAddress: string;
  landmark: string;
  gpsLocation: string; // "latitude, longitude"
  deliveryAddress: string;
  billingAddress: string;
  landlordName: string;
  landlordMobile: string;
  landlordId: string;
  status: CustomerStatus;
  verificationStatus: VerificationStatus;
  documents: CustomerDocuments;
  createdAt: string;
}

export interface AssetLifecycle {
  purchasedDate: string;
  revenueEarned: number;
  repairCost: number;
  currentCondition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  totalRentalsCount: number;
}

export interface Asset {
  id: string; // e.g. "RB-CHAIR-0001"
  barcode: string; // e.g. "RB-CHAIR-0001"
  qrCode: string; // e.g. "RB-CHAIR-0001-QR"
  category: string;
  brand: string;
  model: string;
  purchaseDate: string;
  purchaseCost: number;
  currentValue: number;
  securityDeposit: number;
  monthlyRentalPrice: number;
  warehouse: string;
  city: CityName;
  rackNumber: string;
  status: AssetStatus;
  lifecycle: AssetLifecycle;
  imageUrl?: string;
}

export interface OrderItem {
  assetId: string;
  category: string;
  monthlyRentalPrice: number;
  securityDeposit: number;
}

export interface RentalOrder {
  id: string; // e.g. "RB-ORD-90234"
  customerId: string;
  customerName: string;
  customerMobile: string;
  items: OrderItem[];
  durationMonths: number; // 2, 3, 6, 12, or custom
  startDate: string;
  endDate: string;
  totalDeposit: number;
  depositDiscountAmount?: number;
  depositDiscountType?: 'flat' | 'percent';
  depositDiscountValue?: number;
  netDeposit?: number;
  totalMonthlyRent: number;
  discountAmount: number;
  discountType: 'flat' | 'percent';
  discountValue: number;
  netMonthlyRent: number;
  status: OrderStatus;
  assignedLogisticsUser?: string;
  scannedAtLoading: boolean;
  scannedAtDelivery: boolean;
  scannedAtPickup: boolean;
  scannedAtWarehouseEntry: boolean;
  depositRefundStatus: 'Held' | 'Pending Inspection' | 'Approved' | 'Refunded';
  depositDeductions: number;
  createdAt: string;
}

export interface Invoice {
  id: string; // e.g. "RB-INV-4530"
  orderId: string;
  customerId: string;
  customerName: string;
  billingPeriod: string; // e.g. "July 2026"
  dueDate: string;
  depositAmount: number;
  depositDiscount?: number;
  netDeposit?: number;
  rentalCharges: number;
  lateFee: number;
  discount: number;
  discountType?: 'flat' | 'percent';
  discountValue?: number;
  couponCode?: string;
  totalAmount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  paymentDate?: string;
  paymentMethod?: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  customerId: string;
  customerName: string;
  assetId: string;
  assetName: string;
  complaintType: string;
  description: string;
  images: string[];
  technicianAssigned?: string;
  status: ComplaintStatus;
  createdAt: string;
}

export interface RepairJob {
  id: string;
  assetId: string;
  assetBarcode: string;
  assetName: string;
  repairCost: number;
  vendor: string;
  technician: string;
  repairTimeDays: number;
  warrantyMonths: number;
  photos: string[];
  status: 'In Progress' | 'Completed';
  createdAt: string;
  completedAt?: string;
}

export interface RentalPackage {
  id: string;
  name: string;
  description: string;
  includedAssets: { category: string; quantity: number }[];
  offerPrice: number;
  securityDeposit: number;
  discountPercent: number;
  durationMonths: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userRole: UserRole;
  userName: string;
  city: CityName;
  action: string;
  category: 'BARCODE_SCAN' | 'ORDER_STATUS' | 'ASSET_MOVE' | 'COMPLIANCE' | 'INVENTORY' | 'FRAUD_ALERT';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  details: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  city?: CityName;
}

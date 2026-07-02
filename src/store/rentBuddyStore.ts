import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  UserRole,
  CityName,
  Customer,
  Asset,
  RentalOrder,
  Invoice,
  Complaint,
  RepairJob,
  RentalPackage,
  AuditLog,
  SystemNotification,
  CustomerStatus,
  VerificationStatus,
  AssetStatus,
  OrderStatus,
  InspectionResult,
} from '../types';

interface RentBuddyState {
  // Session & Filters
  currentUserRole: UserRole;
  currentCity: CityName;
  searchQuery: string;
  
  // Data Collections
  customers: Customer[];
  inventory: Asset[];
  orders: RentalOrder[];
  invoices: Invoice[];
  complaints: Complaint[];
  repairs: RepairJob[];
  packages: RentalPackage[];
  auditLogs: AuditLog[];
  notifications: SystemNotification[];
  cities: CityName[];
  
  // Authentication State
  token: string | null;
  currentUser: {
    username: string;
    fullName: string;
    role: UserRole;
    city: CityName;
  } | null;
  loginError: string | null;

  // Fraud Alerts / Automated Audits
  fraudAlerts: string[];
  expectedVsActualAudit: {
    expectedCount: number;
    actualCount: number;
    missingCount: number;
    duplicateBarcodes: string[];
    fraudAlertCount: number;
  };

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setRole: (role: UserRole) => void;
  setCity: (city: CityName) => void;
  addCity: (city: CityName) => void;
  setSearchQuery: (query: string) => void;

  // Customer Actions
  addCustomer: (
    customer: Omit<Customer, 'id' | 'createdAt' | 'status' | 'verificationStatus'>,
    checkoutCart?: {
      items: { assetId: string }[];
      durationMonths: number;
      discountType: 'flat' | 'percent';
      discountValue: number;
      couponCode?: string;
    }
  ) => void;
  updateCustomerStatus: (id: string, status: CustomerStatus) => void;
  verifyCustomerDocuments: (id: string, status: VerificationStatus) => void;

  // Asset Actions
  addAsset: (asset: Omit<Asset, 'id' | 'lifecycle'>) => void;
  updateAssetStatus: (id: string, status: AssetStatus) => void;
  moveAssetWarehouse: (id: string, warehouse: string) => void;

  // Order & POS Checkout Actions
  checkoutOrder: (order: {
    customerId: string;
    items: { assetId: string }[];
    durationMonths: number;
    discountType: 'flat' | 'percent';
    discountValue: number;
    couponCode?: string;
  }) => RentalOrder;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  scanAssetBarcode: (orderId: string, assetId: string, scanType: 'loading' | 'delivery' | 'pickup' | 'warehouse') => boolean;
  refundSecurityDeposit: (orderId: string, deductions: number, reason: string) => void;
  requestOrderReturn: (orderId: string) => void;

  // Return Inspection & Repairs
  submitReturnInspection: (inspection: {
    orderId: string;
    assetId: string;
    cleanliness: boolean;
    scratches: boolean;
    brokenParts: boolean;
    notes: string;
    result: InspectionResult;
  }) => void;
  logRepairJob: (repair: {
    assetId: string;
    technician: string;
    vendor: string;
    repairCost: number;
    repairTimeDays: number;
    warrantyMonths: number;
  }) => void;
  completeRepairJob: (id: string) => void;

  // Finance Actions
  payInvoice: (invoiceId: string, method: string) => void;
  generateMonthlyInvoices: () => void;

  // Packages Actions
  addPackage: (pkg: Omit<RentalPackage, 'id'>) => void;

  // Notification Actions
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // System Simulators
  runSystemAudit: () => void;
  simulateFraud: (type: 'duplicate' | 'mismatch' | 'double_rent') => void;
  triggerMockAlert: (title: string, message: string, type: 'info' | 'warning' | 'error' | 'success') => void;

  // Theme Management
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Database Reset Action
  resetDatabase: () => void;

  // MongoDB Synchronization Action
  initializeStore: () => Promise<void>;
}

// Generate unique IDs
const genId = (prefix: string) => `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

// Mock documents for pre-populated database
const mockSelfie = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';
const mockDocImage = 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=300';

const initialPackages: RentalPackage[] = [
  {
    id: 'PKG-STUDENT',
    name: 'Student Essential Bundle',
    description: 'Perfect setup for students living away from home. Includes a single bed, a study table, and a comfortable chair.',
    includedAssets: [
      { category: 'Bed', quantity: 1 },
      { category: 'Study Table', quantity: 1 },
      { category: 'Chair', quantity: 1 },
    ],
    offerPrice: 999,
    securityDeposit: 1500,
    discountPercent: 20,
    durationMonths: 6,
  },
  {
    id: 'PKG-COUPLE',
    name: 'Cozy Couple Combo',
    description: 'Complete living and bedroom setup for young couples. Includes a Double Bed with mattress, 3-seater Sofa, and Fridge.',
    includedAssets: [
      { category: 'Bed', quantity: 1 },
      { category: 'Mattress', quantity: 1 },
      { category: 'Sofa', quantity: 1 },
      { category: 'Refrigerator', quantity: 1 },
    ],
    offerPrice: 2499,
    securityDeposit: 4500,
    discountPercent: 15,
    durationMonths: 12,
  },
  {
    id: 'PKG-OFFICE',
    name: 'Startup Office Basic',
    description: 'Set up your small office space instantly. Contains 3 ergonomic office chairs, 3 desks, and a small TV unit.',
    includedAssets: [
      { category: 'Chair', quantity: 3 },
      { category: 'Study Table', quantity: 3 },
      { category: 'TV Unit', quantity: 1 },
    ],
    offerPrice: 3499,
    securityDeposit: 6000,
    discountPercent: 25,
    durationMonths: 12,
  },
];

const BACKEND_URL = 'http://localhost:5001/api';

// Debounced synchronization engine to prevent database flooding
let syncTimeout: any = null;
const syncToDatabase = (state: any) => {
  if (syncTimeout) clearTimeout(syncTimeout);
  
  syncTimeout = setTimeout(async () => {
    try {
      const payload = {
        assets: state.inventory,
        customers: state.customers,
        orders: state.orders,
        invoices: state.invoices,
        repairs: state.repairs,
        auditLogs: state.auditLogs,
        notifications: state.notifications,
        cities: state.cities,
        currentCity: state.currentCity,
        currentUserRole: state.currentUserRole,
        expectedVsActualAudit: state.expectedVsActualAudit
      };

      const token = state.token;
      if (!token) return;

      const res = await fetch(`${BACKEND_URL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        console.error("Database sync failed:", data.message);
      }
    } catch (err: any) {
      console.warn("MongoDB Sync Offline:", err.message);
    }
  }, 1000); // 1s debounce
};

export const useRentBuddyStore = create<RentBuddyState>()(
  persist(
    (set, get) => {
      // Setup Initial Mock Data if state is initialized first time
      const getInitialState = () => {
        // Prepopulated Customers
        const mockCustomers: Customer[] = [
          {
            id: 'RB-CUST-1001',
            fullName: 'Rajesh Kumar',
            mobileNumber: '9876543210',
            alternateNumber: '9123456789',
            email: 'rajesh.kumar@gmail.com',
            aadhaarNumber: '1234 5678 9012',
            panNumber: 'ABCDE1234F',
            occupation: 'Software Engineer',
            employer: 'TCS Noida',
            monthlyIncome: 75000,
            currentAddress: 'Sector 62, Landmark Residency, Flat 405',
            permanentAddress: '12, Shanti Nagar, Jaipur, Rajasthan',
            landmark: 'Near Fortis Hospital',
            gpsLocation: '28.6273, 77.3725',
            deliveryAddress: 'Palasia Square, flat 405, Indore (Head Office)',
            billingAddress: 'Palasia Square, flat 405, Indore (Head Office)',
            landlordName: 'S. K. Gupta',
            landlordMobile: '9988776655',
            landlordId: 'LL-49292',
            status: 'Good Customer',
            verificationStatus: 'Verified',
            documents: {
              aadhaarFront: mockDocImage,
              aadhaarBack: mockDocImage,
              panCard: mockDocImage,
              rentAgreement: mockDocImage,
              selfie: mockSelfie,
            },
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'RB-CUST-1002',
            fullName: 'Sonia Gupta',
            mobileNumber: '9812345678',
            alternateNumber: '9876123456',
            email: 'sonia.gupta@outlook.com',
            aadhaarNumber: '9876 5432 1098',
            panNumber: 'XYZWP5678G',
            occupation: 'UI Designer',
            employer: 'Freelaner Inc.',
            monthlyIncome: 45000,
            currentAddress: 'Andheri West, Link Road, Orchid Towers, 12th Floor',
            permanentAddress: '45, Lake View, Bhopal, MP',
            landmark: 'Behind Infinity Mall',
            gpsLocation: '19.1197, 72.8464',
            deliveryAddress: 'Arera Colony, Orchid Towers, 12th Floor, Bhopal',
            billingAddress: 'Arera Colony, Orchid Towers, 12th Floor, Bhopal',
            landlordName: 'Haresh Mehta',
            landlordMobile: '9001100220',
            landlordId: 'LL-99881',
            status: 'VIP',
            verificationStatus: 'Verified',
            documents: {
              aadhaarFront: mockDocImage,
              aadhaarBack: mockDocImage,
              panCard: mockDocImage,
              rentAgreement: mockDocImage,
              selfie: mockSelfie,
            },
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'RB-CUST-1003',
            fullName: 'Vikram Singh',
            mobileNumber: '9765432109',
            alternateNumber: '',
            email: 'vikram.singh@gmail.com',
            aadhaarNumber: '4455 6677 8899',
            panNumber: 'JKLMN9012H',
            occupation: 'Student',
            employer: 'IIT Indore',
            monthlyIncome: 12000,
            currentAddress: 'Hostel 3, Room 22, Simrol Campus',
            permanentAddress: '154, Tilak Nagar, Indore, MP',
            landmark: 'Opposite Library',
            gpsLocation: '22.5244, 75.9207',
            deliveryAddress: 'Navrangpura, Flat 22, Ahmedabad',
            billingAddress: '154, Tilak Nagar, Indore, MP',
            landlordName: 'Hostel Warden',
            landlordMobile: '9111222333',
            landlordId: 'LL-IIT',
            status: 'High Risk',
            verificationStatus: 'Pending',
            documents: {
              aadhaarFront: mockDocImage,
              aadhaarBack: mockDocImage,
              panCard: mockDocImage,
              rentAgreement: mockDocImage,
              selfie: mockSelfie,
            },
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'RB-CUST-1004',
            fullName: 'Amit Sharma',
            mobileNumber: '9999888877',
            alternateNumber: '9888777766',
            email: 'amit.sharma@yahoo.com',
            aadhaarNumber: '1122 3344 5566',
            panNumber: 'PQRST3456D',
            occupation: 'Manager',
            employer: 'HDFC Bank',
            monthlyIncome: 90000,
            currentAddress: 'Adajan, Flat 102',
            permanentAddress: 'Adajan, Flat 102, Surat',
            landmark: 'Near Adajan Lake',
            gpsLocation: '21.1702, 72.8311',
            deliveryAddress: 'Adajan, Flat 102, Surat',
            billingAddress: 'Adajan, Flat 102, Surat',
            landlordName: 'Self-Owned',
            landlordMobile: '',
            landlordId: '',
            status: 'Defaulter',
            verificationStatus: 'Verified',
            documents: {
              aadhaarFront: mockDocImage,
              aadhaarBack: mockDocImage,
              panCard: mockDocImage,
              rentAgreement: mockDocImage,
              selfie: mockSelfie,
            },
            createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ];

        // Prepopulated Assets
        const mockCategories = [
          { name: 'Sofa', deposit: 1500, price: 600, brand: 'Sleepwell', model: '3-Seater Comfort' },
          { name: 'Bed', deposit: 2500, price: 900, brand: 'Godrej Interio', model: 'Queen Size Wooden' },
          { name: 'Mattress', deposit: 1000, price: 400, brand: 'Kurl-On', model: 'Ortho 6-inch' },
          { name: 'Dining Table', deposit: 2000, price: 700, brand: 'Urban Ladder', model: '4-Seater Glass' },
          { name: 'Chair', deposit: 500, price: 200, brand: 'Featherlite', model: 'Ergonomic Mesh Office' },
          { name: 'Wardrobe', deposit: 2500, price: 800, brand: 'Godrej Interio', model: '2-Door Steel Almirah' },
          { name: 'Refrigerator', deposit: 3500, price: 1100, brand: 'LG', model: 'Single Door 190L' },
          { name: 'Washing Machine', deposit: 4000, price: 1200, brand: 'Samsung', model: 'Fully Automatic 6.5kg' },
          { name: 'Study Table', deposit: 800, price: 300, brand: 'IKEA', model: 'Micke Desks' },
          { name: 'TV Unit', deposit: 1500, price: 500, brand: 'Wakefit', model: 'Wall Mounted unit' },
        ];

        const mockAssets: Asset[] = [];
        const cities: CityName[] = ['Indore (Head Office)', 'Bhopal', 'Surat', 'Ahmedabad'];
        const warehouses: { [key: string]: string[] } = {
          'Indore (Head Office)': ['Indore Bypass Warehouse', 'Indore Main Depot'],
          'Bhopal': ['Bhopal Warehouse A'],
          'Surat': ['Surat Warehouse A'],
          'Ahmedabad': ['Ahmedabad Warehouse A', 'Ahmedabad Warehouse B'],
        };

        // Create ~35 mock assets
        let assetCounter = 1;
        cities.forEach(city => {
          const wList = warehouses[city];
          mockCategories.forEach((cat, index) => {
            // Add 1 or 2 items per category in each city
            const count = city === 'Indore (Head Office)' ? 2 : 1;
            for (let i = 0; i < count; i++) {
              const id = `RB-${cat.name.replace(/\s+/g, '').toUpperCase()}-${String(assetCounter).padStart(4, '0')}`;
              const warehouse = wList[i % wList.length];
              const conditionOptions: ('Excellent' | 'Good' | 'Fair' | 'Poor')[] = ['Excellent', 'Good', 'Fair'];
              const condition = conditionOptions[Math.floor(Math.random() * conditionOptions.length)];
              
              // Distribute status
              let status: AssetStatus = 'Available';
              if (assetCounter % 7 === 0) status = 'Under Repair';
              else if (assetCounter % 5 === 0) status = 'Lost';
              else if (assetCounter % 3 === 0) status = 'Rented';

              const ageMonths = Math.floor(Math.random() * 24) + 1;
              const cost = cat.deposit * 5;
              const rentals = status === 'Rented' ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 4);
              const revenue = rentals * cat.price * (Math.floor(Math.random() * 6) + 2);

              mockAssets.push({
                id,
                barcode: id,
                qrCode: `${id}-QR`,
                category: cat.name,
                brand: cat.brand,
                model: cat.model,
                purchaseDate: new Date(Date.now() - ageMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                purchaseCost: cost,
                currentValue: Math.max(1000, cost - (ageMonths * 100)),
                securityDeposit: cat.deposit,
                monthlyRentalPrice: cat.price,
                warehouse,
                city,
                rackNumber: `RACK-${Math.floor(Math.random() * 10) + 1}-${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`,
                status,
                lifecycle: {
                  purchasedDate: new Date(Date.now() - ageMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  revenueEarned: revenue,
                  repairCost: status === 'Under Repair' ? 1200 : Math.floor(Math.random() * 2000),
                  currentCondition: condition,
                  totalRentalsCount: rentals,
                }
              });
              assetCounter++;
            }
          });
        });

        // Prepopulated Orders
        const mockOrders: RentalOrder[] = [
          {
            id: 'RB-ORD-88001',
            customerId: 'RB-CUST-1001',
            customerName: 'Rajesh Kumar',
            customerMobile: '9876543210',
            items: [
              { assetId: mockAssets[2].id, category: mockAssets[2].category, monthlyRentalPrice: mockAssets[2].monthlyRentalPrice, securityDeposit: mockAssets[2].securityDeposit },
              { assetId: mockAssets[5].id, category: mockAssets[5].category, monthlyRentalPrice: mockAssets[5].monthlyRentalPrice, securityDeposit: mockAssets[5].securityDeposit },
            ],
            durationMonths: 6,
            startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date(Date.now() + 135 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            totalDeposit: mockAssets[2].securityDeposit + mockAssets[5].securityDeposit,
            totalMonthlyRent: mockAssets[2].monthlyRentalPrice + mockAssets[5].monthlyRentalPrice,
            discountAmount: 0,
            discountType: 'flat',
            discountValue: 0,
            netMonthlyRent: mockAssets[2].monthlyRentalPrice + mockAssets[5].monthlyRentalPrice,
            status: 'Delivered',
            assignedLogisticsUser: 'Logistics Courier Team A',
            scannedAtLoading: true,
            scannedAtDelivery: true,
            scannedAtPickup: false,
            scannedAtWarehouseEntry: false,
            depositRefundStatus: 'Held',
            depositDeductions: 0,
            createdAt: new Date(Date.now() - 48 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'RB-ORD-88002',
            customerId: 'RB-CUST-1002',
            customerName: 'Sonia Gupta',
            customerMobile: '9812345678',
            items: [
              { assetId: mockAssets[1].id, category: mockAssets[1].category, monthlyRentalPrice: mockAssets[1].monthlyRentalPrice, securityDeposit: mockAssets[1].securityDeposit }
            ],
            durationMonths: 3,
            startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            totalDeposit: mockAssets[1].securityDeposit,
            totalMonthlyRent: mockAssets[1].monthlyRentalPrice,
            discountAmount: 100,
            discountType: 'flat',
            discountValue: 100,
            netMonthlyRent: mockAssets[1].monthlyRentalPrice - 100,
            status: 'Out for Delivery',
            assignedLogisticsUser: 'Logistics Courier Team B',
            scannedAtLoading: true,
            scannedAtDelivery: false,
            scannedAtPickup: false,
            scannedAtWarehouseEntry: false,
            depositRefundStatus: 'Held',
            depositDeductions: 0,
            createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ];

        // Make sure those assets are marked rented or reserved
        mockOrders[0].items.forEach(item => {
          const asset = mockAssets.find(a => a.id === item.assetId);
          if (asset) asset.status = 'Rented';
        });
        mockOrders[1].items.forEach(item => {
          const asset = mockAssets.find(a => a.id === item.assetId);
          if (asset) asset.status = 'Reserved';
        });

        // Prepopulated Invoices
        const mockInvoices: Invoice[] = [
          {
            id: 'RB-INV-99001',
            orderId: 'RB-ORD-88001',
            customerId: 'RB-CUST-1001',
            customerName: 'Rajesh Kumar',
            billingPeriod: 'June 2026',
            dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            depositAmount: 0,
            rentalCharges: mockOrders[0].netMonthlyRent,
            lateFee: 0,
            discount: 0,
            totalAmount: mockOrders[0].netMonthlyRent,
            status: 'Paid',
            paymentDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            paymentMethod: 'UPI (GPay)',
            createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'RB-INV-99002',
            orderId: 'RB-ORD-88001',
            customerId: 'RB-CUST-1001',
            customerName: 'Rajesh Kumar',
            billingPeriod: 'July 2026',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            depositAmount: 0,
            rentalCharges: mockOrders[0].netMonthlyRent,
            lateFee: 0,
            discount: 0,
            totalAmount: mockOrders[0].netMonthlyRent,
            status: 'Pending',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'RB-INV-99003',
            orderId: 'RB-ORD-88002',
            customerId: 'RB-CUST-1002',
            customerName: 'Sonia Gupta',
            billingPeriod: 'First Invoice (Rent + Deposit)',
            dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            depositAmount: mockOrders[1].totalDeposit,
            rentalCharges: mockOrders[1].netMonthlyRent,
            lateFee: 150,
            discount: 0,
            totalAmount: mockOrders[1].totalDeposit + mockOrders[1].netMonthlyRent + 150,
            status: 'Overdue',
            createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ];

        // Prepopulated Complaints
        const mockComplaints: Complaint[] = [
          {
            id: 'RB-CMP-3001',
            customerId: 'RB-CUST-1001',
            customerName: 'Rajesh Kumar',
            assetId: mockAssets[2].id,
            assetName: `${mockAssets[2].brand} ${mockAssets[2].model} (${mockAssets[2].category})`,
            complaintType: 'Scratch on delivery',
            description: 'The wooden panel of the bed has a deep scratch of 3 inches on the backboard.',
            images: [mockDocImage],
            technicianAssigned: 'Karan Singh (Technician)',
            status: 'Assigned',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ];

        // Prepopulated Repairs
        const mockRepairs: RepairJob[] = [
          {
            id: 'RB-REP-4001',
            assetId: mockAssets[4].id,
            assetBarcode: mockAssets[4].barcode,
            assetName: `${mockAssets[4].brand} ${mockAssets[4].category}`,
            repairCost: 500,
            vendor: 'Metro Furniture Repair Shop',
            technician: 'Ramesh Mistri',
            repairTimeDays: 3,
            warrantyMonths: 6,
            photos: [mockDocImage],
            status: 'In Progress',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ];

        // Audit Logs
        const mockAuditLogs: AuditLog[] = [
          {
            id: 'RB-AUD-001',
            timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
            userRole: 'Super Admin',
            userName: 'Ashish (Admin)',
            city: 'Indore (Head Office)',
            action: 'System initialization',
            category: 'INVENTORY',
            severity: 'INFO',
            details: 'Initial master database successfully imported, matching 4 warehouses.',
          },
          {
            id: 'RB-AUD-002',
            timestamp: new Date(Date.now() - 1.5 * 3600000).toISOString(),
            userRole: 'Warehouse Manager',
            userName: 'Vikram Warehouse Lead',
            city: 'Indore (Head Office)',
            action: 'Asset state change',
            category: 'ASSET_MOVE',
            severity: 'INFO',
            details: `Asset ${mockAssets[4].id} status changed to Under Repair. Dispatched to vendor Metro.`,
          },
          {
            id: 'RB-AUD-003',
            timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
            userRole: 'Logistics Team',
            userName: 'Indore Logistics Hub A',
            city: 'Indore (Head Office)',
            action: 'Barcode loading scan',
            category: 'BARCODE_SCAN',
            severity: 'INFO',
            details: `Barcode ${mockAssets[1].barcode} successfully scanned and loaded onto delivery vehicle MP-09-AB-8840.`,
          }
        ];

        // Notifications
        const mockNotifications: SystemNotification[] = [
          {
            id: 'NOT-001',
            title: 'Late Payment Alert',
            message: 'Customer Sonia Gupta has an overdue invoice of ₹4,650 for Order RB-ORD-88002.',
            type: 'error',
            timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
            read: false,
            city: 'Bhopal',
          },
          {
            id: 'NOT-002',
            title: 'Low Stock: Beds',
            message: 'Indore (Head Office) inventory for Bed is below critical threshold. Only 2 items remaining.',
            type: 'warning',
            timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
            read: false,
            city: 'Indore (Head Office)',
          },
          {
            id: 'NOT-003',
            title: 'New Customer Verification',
            message: 'Vikram Singh uploaded document verification files. Awaiting review.',
            type: 'info',
            timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
            read: false,
            city: 'Indore (Head Office)',
          }
        ];

        return {
          currentUserRole: 'Super Admin' as UserRole,
          currentCity: 'Indore (Head Office)' as CityName,
          cities: ['Indore (Head Office)', 'Bhopal', 'Surat', 'Ahmedabad'] as CityName[],
          searchQuery: '',
          token: null as string | null,
          currentUser: null as any | null,
          loginError: null as string | null,
          customers: mockCustomers,
          inventory: mockAssets,
          orders: mockOrders,
          invoices: mockInvoices,
          complaints: mockComplaints,
          repairs: mockRepairs,
          packages: initialPackages,
          auditLogs: mockAuditLogs,
          notifications: mockNotifications,
          fraudAlerts: [],
          expectedVsActualAudit: {
            expectedCount: mockAssets.length,
            actualCount: mockAssets.length,
            missingCount: 0,
            duplicateBarcodes: [],
            fraudAlertCount: 0,
          },
          theme: 'dark' as 'dark' | 'light',
        };
      };

      const initialState = getInitialState();

      // Implement methods
      return {
        ...initialState,

        setRole: (role) => set({ currentUserRole: role }),
        setCity: (city) => set({ currentCity: city }),
        addCity: (city) => {
          set((state) => {
            if (state.cities.includes(city)) return {};
            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'City Created',
              category: 'INVENTORY',
              severity: 'INFO',
              details: `Registered new warehouse city context: "${city}".`,
            };
            return {
              cities: [...state.cities, city],
              auditLogs: [log, ...state.auditLogs],
            };
          });
        },
        setSearchQuery: (query) => set({ searchQuery: query }),

        // Customer Actions
        addCustomer: (custData, checkoutCart) => {
          const custId = genId('RB-CUST');
          const newCustomer: Customer = {
            ...custData,
            id: custId,
            status: 'Verified',
            verificationStatus: 'Verified',
            createdAt: new Date().toISOString(),
          };
          set((state) => {
            const list = [newCustomer, ...state.customers];
            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Customer Onboarding',
              category: 'COMPLIANCE',
              severity: 'INFO',
              details: `Onboarded new customer ${newCustomer.fullName} with Mobile ${newCustomer.mobileNumber}.`,
            };
            return {
              customers: list,
              auditLogs: [log, ...state.auditLogs],
            };
          });

          if (checkoutCart) {
            get().checkoutOrder({
              customerId: custId,
              ...checkoutCart,
            });
          }

          get().runSystemAudit();
        },

        updateCustomerStatus: (id, status) => {
          set((state) => {
            const list = state.customers.map((c) => (c.id === id ? { ...c, status } : c));
            const cName = state.customers.find(c => c.id === id)?.fullName || 'Unknown';
            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Customer status updated',
              category: 'COMPLIANCE',
              severity: status === 'Defaulter' || status === 'Blacklisted' ? 'WARNING' : 'INFO',
              details: `Customer ${cName} profile status flagged as ${status}.`,
            };
            return {
              customers: list,
              auditLogs: [log, ...state.auditLogs],
            };
          });
          get().runSystemAudit();
        },

        verifyCustomerDocuments: (id, verificationStatus) => {
          set((state) => {
            const list = state.customers.map((c) => (c.id === id ? { ...c, verificationStatus } : c));
            const cName = state.customers.find(c => c.id === id)?.fullName || 'Unknown';
            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Document Verification',
              category: 'COMPLIANCE',
              severity: verificationStatus === 'Rejected' ? 'WARNING' : 'INFO',
              details: `Documents for ${cName} were ${verificationStatus} by KYC officer.`,
            };
            return {
              customers: list,
              auditLogs: [log, ...state.auditLogs],
            };
          });
          get().runSystemAudit();
        },

        // Asset Actions
        addAsset: (assetData) => {
          const newAsset: Asset = {
            ...assetData,
            id: `RB-${assetData.category.replace(/\s+/g, '').toUpperCase()}-${String(get().inventory.length + 1000).substring(1)}`,
            lifecycle: {
              purchasedDate: assetData.purchaseDate,
              revenueEarned: 0,
              repairCost: 0,
              currentCondition: 'Excellent',
              totalRentalsCount: 0,
            },
          };
          set((state) => {
            const list = [newAsset, ...state.inventory];
            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Asset procurement',
              category: 'INVENTORY',
              severity: 'INFO',
              details: `Procured new ${newAsset.category} (${newAsset.brand} ${newAsset.model}). Barcode ${newAsset.barcode} registered.`,
            };
            return {
              inventory: list,
              auditLogs: [log, ...state.auditLogs],
            };
          });
          get().runSystemAudit();
        },

        updateAssetStatus: (id, status) => {
          set((state) => {
            const list = state.inventory.map((a) => (a.id === id ? { ...a, status } : a));
            const aDetail = state.inventory.find(a => a.id === id);
            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Asset status update',
              category: 'INVENTORY',
              severity: status === 'Lost' || status === 'Scrapped' ? 'CRITICAL' : 'INFO',
              details: `Asset ${aDetail?.category} [${id}] status changed to ${status}.`,
            };
            return {
              inventory: list,
              auditLogs: [log, ...state.auditLogs],
            };
          });
          get().runSystemAudit();
        },

        moveAssetWarehouse: (id, warehouse) => {
          set((state) => {
            const list = state.inventory.map((a) => (a.id === id ? { ...a, warehouse } : a));
            const aDetail = state.inventory.find(a => a.id === id);
            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Asset relocation',
              category: 'ASSET_MOVE',
              severity: 'INFO',
              details: `Moved asset ${aDetail?.category} [${id}] to warehouse ${warehouse}.`,
            };
            return {
              inventory: list,
              auditLogs: [log, ...state.auditLogs],
            };
          });
          get().runSystemAudit();
        },

        // Checkout / POS Checkout Actions
        checkoutOrder: (checkoutData) => {
          const cust = get().customers.find((c) => c.id === checkoutData.customerId);
          if (!cust) throw new Error('Customer not found');

          const orderItemsDetails = checkoutData.items.map((item) => {
            const asset = get().inventory.find((a) => a.id === item.assetId);
            if (!asset) throw new Error(`Asset ${item.assetId} not found`);
            return {
              assetId: asset.id,
              category: asset.category,
              monthlyRentalPrice: asset.monthlyRentalPrice,
              securityDeposit: asset.securityDeposit,
            };
          });

          const totalDeposit = orderItemsDetails.reduce((sum, item) => sum + item.securityDeposit, 0);
          const totalMonthlyRent = orderItemsDetails.reduce((sum, item) => sum + item.monthlyRentalPrice, 0);
          
          let discountAmount = 0;
          if (checkoutData.discountType === 'percent') {
            discountAmount = Math.round(totalMonthlyRent * (checkoutData.discountValue / 100));
          } else {
            discountAmount = checkoutData.discountValue;
          }

          const netMonthlyRent = Math.max(100, totalMonthlyRent - discountAmount);

          const orderId = genId('RB-ORD');
          const newOrder: RentalOrder = {
            id: orderId,
            customerId: cust.id,
            customerName: cust.fullName,
            customerMobile: cust.mobileNumber,
            items: orderItemsDetails,
            durationMonths: checkoutData.durationMonths,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + checkoutData.durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            totalDeposit,
            totalMonthlyRent,
            discountAmount: discountAmount,
            discountType: checkoutData.discountType,
            discountValue: checkoutData.discountValue,
            netMonthlyRent,
            status: 'Pending', // Awaiting verification / loading
            scannedAtLoading: false,
            scannedAtDelivery: false,
            scannedAtPickup: false,
            scannedAtWarehouseEntry: false,
            depositRefundStatus: 'Held',
            depositDeductions: 0,
            createdAt: new Date().toISOString(),
          };

          // Generate first invoice (Deposit + first month rent)
          const invoiceId = genId('RB-INV');
          const firstInvoice: Invoice = {
            id: invoiceId,
            orderId: orderId,
            customerId: cust.id,
            customerName: cust.fullName,
            billingPeriod: 'Initial Rent & Deposit Hold',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            depositAmount: totalDeposit,
            rentalCharges: netMonthlyRent,
            lateFee: 0,
            discount: discountAmount,
            discountType: checkoutData.discountType,
            discountValue: checkoutData.discountValue,
            couponCode: checkoutData.couponCode,
            totalAmount: totalDeposit + netMonthlyRent,
            status: 'Pending',
            createdAt: new Date().toISOString(),
          };

          set((state) => {
            // Update items status in inventory to Reserved
            const updatedInventory = state.inventory.map((asset) => {
              if (checkoutData.items.some((item) => item.assetId === asset.id)) {
                return { ...asset, status: 'Reserved' as AssetStatus };
              }
              return asset;
            });

            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Order checkout (POS)',
              category: 'ORDER_STATUS',
              severity: 'INFO',
              details: `Created rental order ${orderId} for customer ${cust.fullName}. Assets reserved: ${checkoutData.items.map(i => i.assetId).join(', ')}.`,
            };

            return {
              orders: [newOrder, ...state.orders],
              invoices: [firstInvoice, ...state.invoices],
              inventory: updatedInventory,
              auditLogs: [log, ...state.auditLogs],
            };
          });

          get().runSystemAudit();
          return newOrder;
        },

        updateOrderStatus: (orderId, status) => {
          set((state) => {
            const order = state.orders.find((o) => o.id === orderId);
            if (!order) return {};

            const updatedOrders = state.orders.map((o) => (o.id === orderId ? { ...o, status } : o));

            // Sync Asset status automatically
            const updatedInventory = state.inventory.map((asset) => {
              if (order.items.some((item) => item.assetId === asset.id)) {
                if (status === 'Delivered') {
                  const currentRentals = asset.lifecycle.totalRentalsCount + 1;
                  return {
                    ...asset,
                    status: 'Rented' as AssetStatus,
                    lifecycle: {
                      ...asset.lifecycle,
                      totalRentalsCount: currentRentals,
                    },
                  };
                } else if (status === 'Returned' || status === 'Completed') {
                  return { ...asset, status: 'Available' as AssetStatus };
                } else if (status === 'Pending') {
                  return { ...asset, status: 'Reserved' as AssetStatus };
                }
              }
              return asset;
            });

            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Order status transition',
              category: 'ORDER_STATUS',
              severity: 'INFO',
              details: `Order ${orderId} transitioned to ${status}.`,
            };

            return {
              orders: updatedOrders,
              inventory: updatedInventory,
              auditLogs: [log, ...state.auditLogs],
            };
          });
          get().runSystemAudit();
        },

        scanAssetBarcode: (orderId, assetId, scanType) => {
          const order = get().orders.find((o) => o.id === orderId);
          if (!order) return false;

          const itemExists = order.items.some((item) => item.assetId === assetId);
          if (!itemExists) {
            // Trigger critical log: scanned asset that isn't on order!
            set((state) => {
              const audit: AuditLog = {
                id: genId('RB-AUD'),
                timestamp: new Date().toISOString(),
                userRole: state.currentUserRole,
                userName: `User (${state.currentUserRole})`,
                city: state.currentCity,
                action: 'Invalid scan alert',
                category: 'FRAUD_ALERT',
                severity: 'CRITICAL',
                details: `Logistics team scanned asset ${assetId} for Order ${orderId}, but this asset is NOT part of the rental agreement!`,
              };
              const notif: SystemNotification = {
                id: genId('NOT'),
                title: 'Invalid Scan Warning',
                message: `Asset ${assetId} scanned for order ${orderId} but not matching agreement. Scan cancelled.`,
                type: 'error',
                timestamp: new Date().toISOString(),
                read: false,
                city: state.currentCity,
              };
              return {
                auditLogs: [audit, ...state.auditLogs],
                notifications: [notif, ...state.notifications],
              };
            });
            return false;
          }

          set((state) => {
            const updatedOrders = state.orders.map((o) => {
              if (o.id === orderId) {
                return {
                  ...o,
                  scannedAtLoading: scanType === 'loading' ? true : o.scannedAtLoading,
                  scannedAtDelivery: scanType === 'delivery' ? true : o.scannedAtDelivery,
                  scannedAtPickup: scanType === 'pickup' ? true : o.scannedAtPickup,
                  scannedAtWarehouseEntry: scanType === 'warehouse' ? true : o.scannedAtWarehouseEntry,
                };
              }
              return o;
            });

            const assetDetails = state.inventory.find(a => a.id === assetId);
            const audit: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `Logistics Handheld Scanner`,
              city: state.currentCity,
              action: `Asset Barcode Scan [${scanType.toUpperCase()}]`,
              category: 'BARCODE_SCAN',
              severity: 'INFO',
              details: `Successfully verified asset ${assetDetails?.category} (Code: ${assetId}) at ${scanType} stage.`,
            };

            return {
              orders: updatedOrders,
              auditLogs: [audit, ...state.auditLogs],
            };
          });

          // Transition order status automatically depending on scans
          const updatedOrder = get().orders.find((o) => o.id === orderId);
          if (updatedOrder) {
            if (scanType === 'loading' && updatedOrder.scannedAtLoading && updatedOrder.status === 'Pending') {
              get().updateOrderStatus(orderId, 'Assigned');
            } else if (scanType === 'delivery' && updatedOrder.scannedAtDelivery && updatedOrder.status === 'Out for Delivery') {
              get().updateOrderStatus(orderId, 'Delivered');
            } else if (scanType === 'pickup' && updatedOrder.scannedAtPickup && updatedOrder.status === 'Return Pickup') {
              get().updateOrderStatus(orderId, 'Returned');
            }
          }

          get().runSystemAudit();
          return true;
        },

        refundSecurityDeposit: (orderId, deductions, reason) => {
          set((state) => {
            const updatedOrders = state.orders.map((o) => {
              if (o.id === orderId) {
                return {
                  ...o,
                  depositRefundStatus: 'Refunded' as const,
                  depositDeductions: deductions,
                };
              }
              return o;
            });

            const order = state.orders.find(o => o.id === orderId);
            const refundAmt = (order?.totalDeposit || 0) - deductions;

            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Security Deposit Refund',
              category: 'ORDER_STATUS',
              severity: deductions > 0 ? 'WARNING' : 'INFO',
              details: `Processed deposit refund for order ${orderId}. Total Deposit: ₹${order?.totalDeposit}, Deducted: ₹${deductions} (${reason}), Net Refunded: ₹${refundAmt}.`,
            };

            return {
              orders: updatedOrders,
              auditLogs: [log, ...state.auditLogs],
            };
          });
          get().runSystemAudit();
        },

        requestOrderReturn: (orderId) => {
          get().updateOrderStatus(orderId, 'Return Pickup');
          set((state) => {
            const updatedOrders = state.orders.map(o => o.id === orderId ? { ...o, depositRefundStatus: 'Pending Inspection' as const } : o);
            return { orders: updatedOrders };
          });
        },

        // Return Inspection & Repair
        submitReturnInspection: (inspection) => {
          set((state) => {
            const asset = state.inventory.find(a => a.id === inspection.assetId);
            const category = asset?.category || 'Furniture';

            // Mark asset status
            let finalAssetStatus: AssetStatus = 'Available';
            if (inspection.result === 'Minor Repair' || inspection.result === 'Major Repair') {
              finalAssetStatus = 'Under Repair';
            } else if (inspection.result === 'Scrap') {
              finalAssetStatus = 'Scrapped';
            }

            const updatedInventory = state.inventory.map((a) => {
              if (a.id === inspection.assetId) {
                return {
                  ...a,
                  status: finalAssetStatus,
                  lifecycle: {
                    ...a.lifecycle,
                    currentCondition: inspection.result === 'Excellent' ? 'Excellent' as const :
                                     inspection.result === 'Minor Repair' ? 'Good' as const :
                                     inspection.result === 'Major Repair' ? 'Fair' as const : 'Poor' as const
                  }
                };
              }
              return a;
            });

            // Create repair job if needed
            let updatedRepairs = state.repairs;
            if (finalAssetStatus === 'Under Repair') {
              const newRepair: RepairJob = {
                id: genId('RB-REP'),
                assetId: inspection.assetId,
                assetBarcode: inspection.assetId,
                assetName: `${asset?.brand || ''} ${category}`,
                repairCost: inspection.result === 'Minor Repair' ? 800 : 2500,
                vendor: 'In-house repair hub',
                technician: 'Assigned Senior Repair Tech',
                repairTimeDays: inspection.result === 'Minor Repair' ? 3 : 7,
                warrantyMonths: inspection.result === 'Minor Repair' ? 3 : 12,
                photos: [mockDocImage],
                status: 'In Progress',
                createdAt: new Date().toISOString(),
              };
              updatedRepairs = [newRepair, ...state.repairs];
            }

            // Audit
            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `Quality Control Inspector`,
              city: state.currentCity,
              action: 'Return Quality Inspection',
              category: 'BARCODE_SCAN',
              severity: inspection.result !== 'Excellent' ? 'WARNING' : 'INFO',
              details: `Inspected asset ${inspection.assetId} for Order ${inspection.orderId}. Result: ${inspection.result}. Notes: ${inspection.notes}`,
            };

            return {
              inventory: updatedInventory,
              repairs: updatedRepairs,
              auditLogs: [log, ...state.auditLogs],
            };
          });

          // Mark order complete if all items returned
          const order = get().orders.find(o => o.id === inspection.orderId);
          if (order) {
            get().updateOrderStatus(inspection.orderId, 'Completed');
          }
          get().runSystemAudit();
        },

        logRepairJob: (repair) => {
          const newJob: RepairJob = {
            id: genId('RB-REP'),
            ...repair,
            assetBarcode: repair.assetId,
            assetName: get().inventory.find(a => a.id === repair.assetId)?.category || 'Furniture',
            photos: [mockDocImage],
            status: 'In Progress',
            createdAt: new Date().toISOString(),
          };

          set((state) => {
            const updatedInventory = state.inventory.map(a => a.id === repair.assetId ? { ...a, status: 'Under Repair' as const } : a);
            return {
              repairs: [newJob, ...state.repairs],
              inventory: updatedInventory,
            };
          });
          get().runSystemAudit();
        },

        completeRepairJob: (id) => {
          set((state) => {
            const job = state.repairs.find(j => j.id === id);
            if (!job) return {};

            const updatedRepairs = state.repairs.map(j => j.id === id ? { ...j, status: 'Completed' as const, completedAt: new Date().toISOString() } : j);
            const updatedInventory = state.inventory.map((a) => {
              if (a.id === job.assetId) {
                return {
                  ...a,
                  status: 'Available' as const,
                  lifecycle: {
                    ...a.lifecycle,
                    repairCost: a.lifecycle.repairCost + job.repairCost,
                    currentCondition: 'Excellent' as const,
                  }
                };
              }
              return a;
            });

            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Asset Repair Completed',
              category: 'INVENTORY',
              severity: 'INFO',
              details: `Asset ${job.assetId} successfully repaired by ${job.vendor}. Repair cost ₹${job.repairCost}. Asset returned to inventory.`,
            };

            return {
              repairs: updatedRepairs,
              inventory: updatedInventory,
              auditLogs: [log, ...state.auditLogs],
            };
          });
          get().runSystemAudit();
        },

        // Invoicing & Payment
        payInvoice: (invoiceId, method) => {
          set((state) => {
            const updatedInvoices = state.invoices.map((inv) => {
              if (inv.id === invoiceId) {
                return {
                  ...inv,
                  status: 'Paid' as const,
                  paymentDate: new Date().toISOString().split('T')[0],
                  paymentMethod: method,
                };
              }
              return inv;
            });

            const inv = state.invoices.find(i => i.id === invoiceId);
            const order = state.orders.find(o => o.id === inv?.orderId);

            // If order was waiting on deposit, transition it
            const updatedOrders = state.orders.map((o) => {
              if (o.id === inv?.orderId && o.status === 'Pending') {
                return { ...o, status: 'Assigned' as const };
              }
              return o;
            });

            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Invoice payment received',
              category: 'ORDER_STATUS',
              severity: 'INFO',
              details: `Received payment of ₹${inv?.totalAmount} for invoice ${invoiceId} via ${method}.`,
            };

            // Update asset revenue
            let updatedInventory = state.inventory;
            if (inv && order) {
              const perAssetRent = inv.rentalCharges / order.items.length;
              updatedInventory = state.inventory.map((asset) => {
                if (order.items.some(item => item.assetId === asset.id)) {
                  return {
                    ...asset,
                    lifecycle: {
                      ...asset.lifecycle,
                      revenueEarned: asset.lifecycle.revenueEarned + perAssetRent,
                    }
                  };
                }
                return asset;
              });
            }

            return {
              invoices: updatedInvoices,
              orders: updatedOrders,
              inventory: updatedInventory,
              auditLogs: [log, ...state.auditLogs],
            };
          });
          get().runSystemAudit();
        },

        generateMonthlyInvoices: () => {
          const activeOrders = get().orders.filter(o => o.status === 'Delivered');
          if (activeOrders.length === 0) return;

          const newInvoices: Invoice[] = [];
          const nowStr = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

          activeOrders.forEach(o => {
            const hasExisting = get().invoices.some(i => i.orderId === o.id && i.billingPeriod === nowStr);
            if (!hasExisting) {
              newInvoices.push({
                id: genId('RB-INV'),
                orderId: o.id,
                customerId: o.customerId,
                customerName: o.customerName,
                billingPeriod: nowStr,
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                depositAmount: 0,
                rentalCharges: o.netMonthlyRent,
                lateFee: 0,
                discount: 0,
                totalAmount: o.netMonthlyRent,
                status: 'Pending',
                createdAt: new Date().toISOString(),
              });
            }
          });

          if (newInvoices.length > 0) {
            set((state) => {
              const log: AuditLog = {
                id: genId('RB-AUD'),
                timestamp: new Date().toISOString(),
                userRole: 'Finance',
                userName: 'System Cron Job',
                city: state.currentCity,
                action: 'Automated Billing Run',
                category: 'INVENTORY',
                severity: 'INFO',
                details: `Generated ${newInvoices.length} monthly rental invoices for active customer orders.`,
              };
              return {
                invoices: [...newInvoices, ...state.invoices],
                auditLogs: [log, ...state.auditLogs],
              };
            });
            get().runSystemAudit();
          }
        },

        addPackage: (pkg) => {
          const newPkg: RentalPackage = {
            id: genId('PKG'),
            ...pkg,
          };
          set((state) => ({ packages: [...state.packages, newPkg] }));
        },

        markNotificationRead: (id) => {
          set((state) => ({
            notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
          }));
        },

        clearNotifications: () => {
          set({ notifications: [] });
        },

        // System Audits
        runSystemAudit: () => {
          const state = get();
          const alerts: string[] = [];
          const duplicateBarcodesList: string[] = [];

          // 1. Check for Duplicate Barcodes
          const barcodes = state.inventory.map(a => a.barcode);
          const duplicates = barcodes.filter((item, index) => barcodes.indexOf(item) !== index);
          if (duplicates.length > 0) {
            duplicates.forEach(d => {
              if (!duplicateBarcodesList.includes(d)) {
                duplicateBarcodesList.push(d);
                alerts.push(`Duplicate barcode detected: "${d}" registered on multiple assets.`);
              }
            });
          }

          // 2. Asset marked Available but Rented (delivered in order)
          state.orders.forEach(o => {
            if (o.status === 'Delivered') {
              o.items.forEach(item => {
                const asset = state.inventory.find(a => a.id === item.assetId);
                if (asset && asset.status === 'Available') {
                  alerts.push(`Discrepancy: Asset ${item.assetId} is marked "Available" in Warehouse but is linked to active order ${o.id} delivered to ${o.customerName}.`);
                }
              });
            }
          });

          // 3. Multi-Customer Asset Assignment (fraud indicator)
          const assetRentCount: { [id: string]: string[] } = {};
          state.orders.forEach(o => {
            if (o.status !== 'Completed' && o.status !== 'Returned') {
              o.items.forEach(item => {
                if (!assetRentCount[item.assetId]) {
                  assetRentCount[item.assetId] = [];
                }
                assetRentCount[item.assetId].push(o.id);
              });
            }
          });
          Object.keys(assetRentCount).forEach(assetId => {
            if (assetRentCount[assetId].length > 1) {
              alerts.push(`Critical Fraud Alert: Asset ${assetId} is actively assigned to multiple concurrent orders (${assetRentCount[assetId].join(', ')}).`);
            }
          });

          // 4. Warehouse Mismatch Check
          state.orders.forEach(o => {
            if (o.status === 'Delivered') {
              o.items.forEach(item => {
                const asset = state.inventory.find(a => a.id === item.assetId);
                const customer = state.customers.find(c => c.id === o.customerId);
                if (asset && customer) {
                  const custCity = state.cities.find(city => 
                    customer.deliveryAddress.toLowerCase().includes(city.toLowerCase().replace(' (head office)', ''))
                  ) || state.cities[0];
                  if (asset.city !== custCity) {
                    alerts.push(`Warehouse Mismatch: Asset ${asset.id} resides in ${asset.city} (${asset.warehouse}) but is currently delivered to customer in ${custCity}.`);
                  }
                }
              });
            }
          });

          // Trigger notifications for new warnings
          const currentNotifications = [...state.notifications];
          alerts.forEach(alertText => {
            const hasNotif = currentNotifications.some(n => n.message === alertText);
            if (!hasNotif) {
              currentNotifications.unshift({
                id: genId('NOT'),
                title: 'System Audit Alert',
                message: alertText,
                type: 'error',
                timestamp: new Date().toISOString(),
                read: false,
              });
            }
          });

          set({
            fraudAlerts: alerts,
            notifications: currentNotifications.slice(0, 30), // cap notifications at 30
            expectedVsActualAudit: {
              expectedCount: state.inventory.length,
              actualCount: state.inventory.filter(a => a.status !== 'Lost' && a.status !== 'Scrapped').length,
              missingCount: state.inventory.filter(a => a.status === 'Lost').length,
              duplicateBarcodes: duplicateBarcodesList,
              fraudAlertCount: alerts.length,
            }
          });
        },

        simulateFraud: (type) => {
          set((state) => {
            let updatedInventory = [...state.inventory];
            let actionText = '';
            
            if (type === 'duplicate') {
              // Duplicate the barcode of the first asset onto the second asset
              if (updatedInventory.length > 2) {
                const firstBarcode = updatedInventory[0].barcode;
                updatedInventory[1] = {
                  ...updatedInventory[1],
                  barcode: firstBarcode,
                  qrCode: `${firstBarcode}-QR`
                };
                actionText = `Simulated duplicate barcode injection. Scanned asset ID "${updatedInventory[1].id}" now uses code "${firstBarcode}" from "${updatedInventory[0].id}".`;
              }
            } else if (type === 'mismatch') {
              // Asset available, but force mark delivered
              if (updatedInventory.length > 0) {
                const availAsset = updatedInventory.find(a => a.status === 'Available');
                if (availAsset) {
                  availAsset.status = 'Available'; // keeps status
                  // Create order but mark asset as available in database
                  actionText = `Simulated inventory state discrepancy: Asset "${availAsset.id}" is set to "Available" but actively marked delivered.`;
                }
              }
            } else if (type === 'double_rent') {
              // Rent the same asset in two separate active orders
              if (state.orders.length > 0 && updatedInventory.length > 0) {
                const rentedAssetId = updatedInventory.find(a => a.status === 'Rented')?.id || updatedInventory[0].id;
                // Add this asset to another order
                const anotherOrder = state.orders[state.orders.length - 1];
                if (anotherOrder) {
                  anotherOrder.items.push({
                    assetId: rentedAssetId,
                    category: 'Sofa',
                    monthlyRentalPrice: 600,
                    securityDeposit: 1500
                  });
                  actionText = `Simulated double-rental fraud: Asset "${rentedAssetId}" was assigned to two active agreements.`;
                }
              }
            }

            const audit: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `Fraud Simulator Tool`,
              city: state.currentCity,
              action: 'Fraud Simulation Injected',
              category: 'FRAUD_ALERT',
              severity: 'CRITICAL',
              details: actionText,
            };

            return {
              inventory: updatedInventory,
              auditLogs: [audit, ...state.auditLogs],
            };
          });
          get().runSystemAudit();
        },

        triggerMockAlert: (title, message, type) => {
          set((state) => {
            const newNotif: SystemNotification = {
              id: genId('NOT'),
              title,
              message,
              type,
              timestamp: new Date().toISOString(),
              read: false,
              city: state.currentCity,
            };
            return {
              notifications: [newNotif, ...state.notifications],
            };
          });
        },

        toggleTheme: () => {
          set((state) => ({
            theme: state.theme === 'dark' ? 'light' : 'dark',
          }));
        },

        resetDatabase: () => {
          const freshState = getInitialState();
          set({
            ...freshState,
            theme: get().theme,
            notifications: [
              {
                id: genId('NOT'),
                title: 'Database Reset Successful',
                message: 'All system metrics, assets, barcodes, and agreements have been restored to pristine default values.',
                type: 'success',
                timestamp: new Date().toISOString(),
                read: false,
                city: freshState.currentCity,
              },
              ...freshState.notifications
            ]
          });
          get().runSystemAudit();
        },

        login: async (username, password) => {
          try {
            set({ loginError: null });
            const res = await fetch(`${BACKEND_URL}/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success && data.token) {
              set({
                token: data.token,
                currentUser: data.user,
                currentUserRole: data.user.role,
                currentCity: data.user.city,
                loginError: null
              });
              await get().initializeStore();
              return true;
            } else {
              set({ loginError: data.message || 'Invalid username or password' });
              return false;
            }
          } catch (err: any) {
            set({ loginError: 'Authentication server connection error' });
            return false;
          }
        },

        logout: () => {
          set({
            token: null,
            currentUser: null,
            loginError: null
          });
        },

        initializeStore: async () => {
          try {
            const token = get().token;
            if (!token) return;

            const res = await fetch(`${BACKEND_URL}/load`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success && data.data) {
              const db = data.data;
              
              // Seed database if MongoDB is completely empty
              if (!db.assets || db.assets.length === 0) {
                console.log("MongoDB Atlas cluster is empty. Seeding default data...");
                const localState = get();
                await fetch(`${BACKEND_URL}/sync`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    assets: localState.inventory,
                    customers: localState.customers,
                    orders: localState.orders,
                    invoices: localState.invoices,
                    repairs: localState.repairs,
                    auditLogs: localState.auditLogs,
                    notifications: localState.notifications,
                    cities: localState.cities,
                    currentCity: localState.currentCity,
                    currentUserRole: localState.currentUserRole,
                    expectedVsActualAudit: localState.expectedVsActualAudit
                  })
                });
                return;
              }

              // Overwrite local memory state with synced cluster collections
              set({
                inventory: db.assets,
                customers: db.customers,
                orders: db.orders,
                invoices: db.invoices,
                repairs: db.repairs,
                auditLogs: db.auditLogs,
                notifications: db.notifications,
                cities: db.cities || get().cities,
                currentCity: db.currentCity || get().currentCity,
                currentUserRole: db.currentUserRole || get().currentUserRole,
                expectedVsActualAudit: db.expectedVsActualAudit || get().expectedVsActualAudit
              });
              console.log("Synced local state successfully with MongoDB Atlas.");
            }
          } catch (err: any) {
            console.warn("MongoDB Atlas offline, falling back to offline LocalStorage cache:", err.message);
          }
        }
      };
    },
    {
      name: 'rentbuddy-erp-storage-v2',
    }
  )
);

// Replicate Zustand store updates to MongoDB Atlas on changes
useRentBuddyStore.subscribe((state) => {
  syncToDatabase(state);
});

// Notification audio synthesizer using Web Audio API (offline-safe, zero assets needed)
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Play a dual-chime notification chime (A5 -> E6)
    playTone(880, ctx.currentTime, 0.12);
    playTone(1318.51, ctx.currentTime + 0.08, 0.25);
  } catch (e) {
    console.warn("Failed to play notification audio:", e);
  }
};

// Auto-trigger audio sound when a new notification is added to the store state
let lastNotifsCount = useRentBuddyStore.getState()?.notifications?.length || 0;

useRentBuddyStore.subscribe((state) => {
  const currentCount = state.notifications?.length || 0;
  if (currentCount > lastNotifsCount) {
    playNotificationSound();
  }
  lastNotifsCount = currentCount;
});

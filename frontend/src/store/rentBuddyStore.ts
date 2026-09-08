import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getApiBaseUrl } from '../api/client';
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
  LogisticsDriver,
  DriverDocuments,
  LogisticsDriverStatus,
  DriverVehicleType,
  OrganizationConfig,
} from '../types';

interface RentBuddyState {
  // Session & Filters
  currentUserRole: UserRole;
  currentCity: CityName;
  searchQuery: string;

  // Organization Configuration
  organizationConfig: OrganizationConfig;
  updateOrganizationConfig: (updates: Partial<OrganizationConfig>) => void;

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
  drivers: LogisticsDriver[];

  // Authentication State
  token: string | null;
  currentUser: {
    username: string;
    fullName: string;
    role: UserRole;
    city: CityName;
    permissions?: string[];
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
      depositDiscountType?: 'flat' | 'percent';
      depositDiscountValue?: number;
      couponCode?: string;
    }
  ) => void;
  updateCustomerStatus: (id: string, status: CustomerStatus) => void;
  verifyCustomerDocuments: (id: string, status: VerificationStatus) => void;

  // Asset Actions
  addAsset: (asset: Omit<Asset, 'id' | 'lifecycle'>) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  updateAssetStatus: (id: string, status: AssetStatus) => void;
  moveAssetWarehouse: (id: string, warehouse: string) => void;

  // Order & POS Checkout Actions
  checkoutOrder: (order: {
    customerId: string;
    items: { assetId: string }[];
    durationMonths: number;
    discountType: 'flat' | 'percent';
    discountValue: number;
    depositDiscountType?: 'flat' | 'percent';
    depositDiscountValue?: number;
    couponCode?: string;
  }) => RentalOrder;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  prepareOrder: (orderId: string, packedBy?: string) => Promise<boolean>;
  cancelOrder: (orderId: string, reason?: string) => Promise<boolean>;
  assignDriverToOrder: (orderId: string, driverId: string) => Promise<boolean>;
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

  // Logistics Driver & KYC Actions
  addDriver: (driver: Omit<LogisticsDriver, 'id' | 'createdAt'>) => void;
  updateDriver: (id: string, updates: Partial<LogisticsDriver>) => void;
  deleteDriver: (id: string) => void;
  updateDriverStatus: (id: string, status: LogisticsDriverStatus, notes?: string) => void;
  verifyDriverDocument: (id: string, docKey: keyof DriverDocuments, verified: boolean) => void;
  verifyAllDriverDocuments: (id: string, status: VerificationStatus, notes?: string) => void;
  toggleBlockDriver: (id: string, isBlocked: boolean, reason?: string) => void;
  updateDriverDocuments: (id: string, documents: Partial<DriverDocuments>) => void;

  // Notification Actions
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
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

const BACKEND_URL = getApiBaseUrl();

// Active sync flag & block override tracker to guarantee zero-revert state
let isSyncingFromServer = false;
export const recentDriverBlockOverrides = new Map<string, { isBlocked: boolean; timestamp: number }>();

// Debounced & immediate synchronization engine to prevent database flooding and data loss
let syncTimeout: any = null;
const syncToDatabase = (state: any, immediate: boolean = false) => {
  if (isSyncingFromServer) return;

  const performSync = async () => {
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

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
      }

      const res = await fetch(`${BACKEND_URL}/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        console.log('🍃 [RentBuddy Store] MongoDB Atlas sync completed successfully.');
      }
    } catch (err: any) {
      console.warn('⚠️ [RentBuddy Store] Offline cache active. Sync deferred:', err.message);
    }
  };

  if (immediate) {
    if (syncTimeout) clearTimeout(syncTimeout);
    performSync();
    return;
  }

  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(performSync, 1000);
};

export const useRentBuddyStore = create<RentBuddyState>()(
  persist(
    (set, get) => {
      // Clean Initial State (Populated dynamically from MongoDB Atlas)
      const getInitialState = () => {
        return {
          currentUserRole: 'Super Admin' as UserRole,
          currentCity: 'Indore (Head Office)' as CityName,
          cities: ['Indore (Head Office)', 'Bhopal', 'Surat', 'Ahmedabad'] as CityName[],
          searchQuery: '',
          organizationConfig: {
            companyName: 'RentBuddy Furnishing & Appliances',
            tagline: 'Enterprise Rental & Fleet Logistics Portal',
            gstin: '23AABCR8901L1Z5',
            pan: 'AABCR8901L',
            cin: 'U72900MP2026PTC045123',
            headOfficeAddress: 'Plot 45, Scheme 54, PU-4 Commercial Complex, Indore, MP 452010',
            supportPhone: '+91 98260 12345',
            supportEmail: 'support@rentbuddy.in',
            billingEmail: 'billing@rentbuddy.in',
            website: 'https://rentbuddy.in',
          },
          token: null as string | null,
          currentUser: null as any | null,
          loginError: null as string | null,
          customers: [],
          inventory: [],
          orders: [],
          invoices: [],
          complaints: [],
          repairs: [],
          packages: [],
          auditLogs: [],
          notifications: [],
          drivers: [],
          fraudAlerts: [],
          expectedVsActualAudit: {
            expectedCount: 0,
            actualCount: 0,
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

        updateOrganizationConfig: (updates) => {
          set((state) => ({
            organizationConfig: { ...state.organizationConfig, ...updates }
          }));
        },

        setRole: (role) => set({ currentUserRole: role }),
        setCity: (city) => {
          try {
            localStorage.setItem('rentbuddy_active_city', city);
          } catch (_) { }
          set({ currentCity: city });
          fetch(`${BACKEND_URL}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentCity: city })
          }).catch(() => { });
        },
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
          const targetCity = custData.city || get().currentCity || 'Ahmedabad';
          const newCustomer: Customer = {
            ...custData,
            id: custId,
            city: targetCity,
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
              city: targetCity,
              action: 'Customer Onboarding',
              category: 'COMPLIANCE',
              severity: 'INFO',
              details: `Onboarded new customer ${newCustomer.fullName} with Mobile ${newCustomer.mobileNumber} in ${targetCity}.`,
            };
            return {
              customers: list,
              auditLogs: [log, ...state.auditLogs],
            };
          });

          // Immediate persistence to MongoDB Atlas to prevent 5-second polling rollback
          syncToDatabase(get(), true);

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

          // Immediately sync with MongoDB
          fetch(`${BACKEND_URL}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAsset)
          }).catch(() => { });
        },

        updateAsset: (id, updates) => {
          set((state) => {
            const list = state.inventory.map((a) => (a.id === id ? { ...a, ...updates } : a));
            const aDetail = state.inventory.find((a) => a.id === id);
            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Asset update',
              category: 'INVENTORY',
              severity: 'INFO',
              details: `Updated asset ${aDetail?.category} [${id}] (${updates.brand || aDetail?.brand} ${updates.model || aDetail?.model}).`,
            };
            return {
              inventory: list,
              auditLogs: [log, ...state.auditLogs],
            };
          });
          get().runSystemAudit();

          // Immediately persist updates to backend MongoDB
          fetch(`${BACKEND_URL}/assets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          }).catch(() => { });
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

          // Immediately persist status to backend MongoDB
          fetch(`${BACKEND_URL}/assets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          }).catch(() => { });
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
              category: 'INVENTORY',
              severity: 'INFO',
              details: `Relocated asset ${aDetail?.category} [${id}] to warehouse "${warehouse}".`,
            };
            return {
              inventory: list,
              auditLogs: [log, ...state.auditLogs],
            };
          });
          get().runSystemAudit();

          // Immediately persist warehouse to backend MongoDB
          fetch(`${BACKEND_URL}/assets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ warehouse })
          }).catch(() => { });
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
          const totalTenureRent = totalMonthlyRent * checkoutData.durationMonths;

          let discountAmount = 0;
          if (checkoutData.discountType === 'percent') {
            discountAmount = Math.round(totalTenureRent * (checkoutData.discountValue / 100));
          } else {
            discountAmount = checkoutData.discountValue;
          }

          const netTenureRent = Math.max(100, totalTenureRent - discountAmount);
          const netMonthlyRent = Math.round(netTenureRent / checkoutData.durationMonths);

          let depositDiscountAmount = 0;
          const depType = checkoutData.depositDiscountType || 'flat';
          const depVal = checkoutData.depositDiscountValue || 0;
          if (depType === 'percent') {
            depositDiscountAmount = Math.round(totalDeposit * (depVal / 100));
          } else {
            depositDiscountAmount = depVal;
          }
          const netDeposit = Math.max(0, totalDeposit - depositDiscountAmount);

          const orderId = genId('RB-ORD');
          const newOrder: RentalOrder = {
            id: orderId,
            customerId: cust.id,
            customerName: cust.fullName,
            customerMobile: cust.mobileNumber,
            city: cust.city || get().currentCity,
            deliveryAddress: cust.deliveryAddress || cust.currentAddress,
            items: orderItemsDetails,
            durationMonths: checkoutData.durationMonths,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + checkoutData.durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            totalDeposit,
            depositDiscountAmount,
            depositDiscountType: depType,
            depositDiscountValue: depVal,
            netDeposit,
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

          // Generate first invoice (Deposit + Total contract tenure rent)
          const invoiceId = genId('RB-INV');
          const firstInvoice: Invoice = {
            id: invoiceId,
            orderId: orderId,
            customerId: cust.id,
            customerName: cust.fullName,
            billingPeriod: `${checkoutData.durationMonths} Months Tenure Rent & Deposit Hold`,
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            depositAmount: totalDeposit,
            depositDiscount: depositDiscountAmount,
            netDeposit: netDeposit,
            rentalCharges: netTenureRent,
            lateFee: 0,
            discount: discountAmount,
            discountType: checkoutData.discountType,
            discountValue: checkoutData.discountValue,
            couponCode: checkoutData.couponCode,
            totalAmount: netDeposit + netTenureRent,
            status: 'Pending',
            createdAt: new Date().toISOString(),
          };

          set((state) => {
            // Update items status in inventory to Reserved
            const updatedInventory = state.inventory.map((asset) => {
              if (checkoutData.items.some((item) => item.assetId === asset.id || item.assetId === (asset as any)._id || item.assetId === asset.barcode)) {
                return {
                  ...asset,
                  status: 'Reserved' as AssetStatus,
                  currentOrderId: orderId,
                  currentCustomer: cust.fullName
                };
              }
              return asset;
            });

            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: cust.city || state.currentCity,
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

          // 1. Immediately persist Order and Asset status to backend API
          try {
            fetch(`${BACKEND_URL}/orders`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newOrder)
            }).catch(() => { });

            // Update each asset on backend
            for (const item of checkoutData.items) {
              fetch(`${BACKEND_URL}/assets/${item.assetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'Reserved',
                  currentOrderId: orderId,
                  currentCustomer: cust.fullName
                })
              }).catch(() => { });
            }
          } catch (_) { }

          // 2. Trigger instant debounced database sync
          syncToDatabase(get());

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

        prepareOrder: async (orderId: string, packedBy: string = 'Warehouse Staging Team') => {
          const now = new Date().toISOString();
          set((state) => {
            const updatedOrders = state.orders.map((o) => {
              if (o.id === orderId || (o as any)._id === orderId) {
                return {
                  ...o,
                  isPrepared: true,
                  status: 'Ready for Dispatch' as OrderStatus,
                  deliveryStatus: 'ready_for_dispatch',
                  preparedAt: now,
                  packedBy,
                };
              }
              return o;
            });

            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: now,
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: state.currentCity,
              action: 'Order Staged & Prepared',
              category: 'ORDER_STATUS',
              severity: 'INFO',
              details: `Order ${orderId} staged, packed, barcode label printed by ${packedBy}. Ready for driver dispatch.`,
            };

            return {
              orders: updatedOrders,
              auditLogs: [log, ...state.auditLogs],
            };
          });

          // Sync to backend DB immediately
          syncToDatabase(get(), true);

          try {
            await fetch(`${BACKEND_URL}/orders/${encodeURIComponent(orderId)}/prepare`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ packedBy }),
            });
          } catch (e) {
            console.warn("Backend prepare order sync deferred:", e);
          }

          get().runSystemAudit();
          return true;
        },

        cancelOrder: async (orderId: string, reason?: string) => {
          const order = get().orders.find((o) => o.id === orderId);
          if (!order) return false;

          set((state) => {
            const updatedOrders = state.orders.map((o) => {
              if (o.id === orderId) {
                return {
                  ...o,
                  status: 'Cancelled' as OrderStatus,
                  cancellationReason: reason || 'Customer requested cancellation at staging',
                  cancelledAt: new Date().toISOString(),
                };
              }
              return o;
            });

            // Restore all allocated items back to Available stock in city inventory
            const updatedInventory = state.inventory.map((asset) => {
              if (order.items.some((item) => item.assetId === asset.id)) {
                return {
                  ...asset,
                  status: 'Available' as AssetStatus,
                  currentCustomer: undefined,
                  currentOrderId: undefined,
                };
              }
              return asset;
            });

            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: order.city || state.currentCity,
              action: 'Order Cancelled & Stock Restored',
              category: 'ORDER_STATUS',
              severity: 'WARNING',
              details: `Order ${orderId} (${order.customerName}) was cancelled. Reason: ${reason || 'Refused/Cancelled at Staging'}. ${order.items.length} items returned to Available stock in warehouse.`,
            };

            const notif: SystemNotification = {
              id: genId('NOT'),
              title: 'Order Cancelled & Stock Restored',
              message: `Order #${orderId} cancelled. ${order.items.length} items restored to Available warehouse inventory.`,
              type: 'info',
              timestamp: new Date().toISOString(),
              read: false,
              city: order.city || state.currentCity,
            };

            return {
              orders: updatedOrders,
              inventory: updatedInventory,
              auditLogs: [log, ...state.auditLogs],
              notifications: [notif, ...state.notifications],
            };
          });

          // Sync to backend API
          try {
            await fetch(`${BACKEND_URL}/orders/${orderId}/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason }),
            });
          } catch (e) {
            console.warn("Offline fallback for order cancellation:", e);
          }

          get().runSystemAudit();
          return true;
        },

        assignDriverToOrder: async (orderId: string, driverId: string) => {
          const order = get().orders.find((o) => o.id === orderId);
          const driver = get().drivers.find((d) => d.id === driverId || (d as any)._id === driverId || d.phone === driverId);
          if (!driver || !order) return false;

          // City cross-check validation
          const getBaseCity = (cityName?: string) => (cityName || '').split('(')[0].trim().toLowerCase();
          const orderCity = getBaseCity(order.city || get().currentCity);
          const driverCity = getBaseCity(driver.city);

          if (orderCity && driverCity && orderCity !== driverCity && !orderCity.includes(driverCity) && !driverCity.includes(orderCity)) {
            console.warn(`[RentBuddy Logistics] Driver assignment rejected: Driver ${driver.fullName} (${driver.city}) does not belong to Order city (${order.city || get().currentCity}).`);
            return false;
          }

          set((state) => {
            const updatedOrders = state.orders.map((o) => {
              if (o.id === orderId) {
                return {
                  ...o,
                  assignedDriverId: driver.id,
                  assignedDriverName: driver.fullName,
                  assignedDriverPhone: driver.phone,
                  assignedLogisticsUser: driver.fullName,
                  status: 'Assigned' as OrderStatus,
                };
              }
              return o;
            });

            const log: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `User (${state.currentUserRole})`,
              city: order.city || driver.city || state.currentCity,
              action: 'Driver Assignment',
              category: 'ORDER_STATUS',
              severity: 'INFO',
              details: `Assigned driver ${driver.fullName} (${driver.phone}) from ${driver.city} hub to order ${orderId} (${order.city || state.currentCity}).`,
            };

            return {
              orders: updatedOrders,
              auditLogs: [log, ...state.auditLogs],
            };
          });

          // Sync to Backend API
          try {
            await fetch(`${BACKEND_URL}/orders/${orderId}/assign-driver`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ driverId: driver.id }),
            });
          } catch (e) {
            console.warn("Offline fallback for driver assignment:", e);
          }

          get().runSystemAudit();
          return true;
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
                photos: [],
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
          const chosenAsset = get().inventory.find(a => a.id === repair.assetId || a.barcode === (repair as any).assetBarcode);
          const newJob: RepairJob = {
            id: genId('RB-REP'),
            ...repair,
            city: (repair as any).city || chosenAsset?.city || get().currentCity || 'Indore (Head Office)',
            assetBarcode: (repair as any).assetBarcode || repair.assetId,
            assetName: (repair as any).assetName || chosenAsset?.category || 'Furniture Unit',
            photos: [],
            status: 'In Progress',
            createdAt: new Date().toISOString(),
          };

          set((state) => {
            const updatedInventory = state.inventory.map(a =>
              (a.id === repair.assetId || a.barcode === (repair as any).assetBarcode)
                ? { ...a, status: 'Under Repair' as const }
                : a
            );
            return {
              repairs: [newJob, ...state.repairs],
              inventory: updatedInventory,
            };
          });
          syncToDatabase(get(), true);
          get().runSystemAudit();
        },

        completeRepairJob: (id) => {
          set((state) => {
            const job = state.repairs.find(j => j.id === id || (j as any)._id === id);
            if (!job) return {};

            const updatedRepairs = state.repairs.map(j => (j.id === id || (j as any)._id === id) ? { ...j, status: 'Completed' as const, completedAt: new Date().toISOString() } : j);
            const updatedInventory = state.inventory.map((a) => {
              if (a.id === job.assetId || a.barcode === job.assetBarcode) {
                return {
                  ...a,
                  status: 'Available' as const,
                  lifecycle: {
                    ...a.lifecycle,
                    repairCost: (a.lifecycle?.repairCost || 0) + (job.repairCost || 0),
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
              city: (job as any).city || state.currentCity,
              action: 'Asset Repair Completed',
              category: 'INVENTORY',
              severity: 'INFO',
              details: `Asset ${job.assetId} (${job.assetBarcode || ''}) successfully repaired by ${job.vendor}. Repair cost ₹${job.repairCost}. Asset returned to inventory.`,
            };

            return {
              repairs: updatedRepairs,
              inventory: updatedInventory,
              auditLogs: [log, ...state.auditLogs],
            };
          });
          syncToDatabase(get(), true);
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

        // Logistics Driver & KYC Actions
        addDriver: (driverData) => {
          const cleanPhone = (driverData.phone || '').replace(/[^0-9]/g, '').slice(-10);
          const driverId = cleanPhone ? `DRV-${cleanPhone.slice(-4)}` : genId('DRV');
          const newDriver: LogisticsDriver = {
            ...driverData,
            id: driverId,
            status: driverData.status || 'Active',
            verificationStatus: driverData.verificationStatus || 'Verified',
            totalDelivered: 0,
            pendingDeliveries: 0,
            deadlineOverdue: 0,
            rating: 5.0,
            isBlocked: false,
            createdAt: new Date().toISOString(),
          };

          set((state) => {
            const audit: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `Fleet Admin (${state.currentUserRole})`,
              city: newDriver.city,
              action: 'Driver Onboarding',
              category: 'COMPLIANCE',
              severity: 'INFO',
              details: `Onboarded new logistics driver ${newDriver.fullName} (${driverId}) with vehicle ${newDriver.vehicleNumber}.`,
            };

            const notif: SystemNotification = {
              id: genId('NOT'),
              title: 'Driver Onboarded',
              message: `New driver ${newDriver.fullName} (${driverId}) registered for ${newDriver.city}. Verification completed.`,
              type: 'info',
              timestamp: new Date().toISOString(),
              read: false,
              city: newDriver.city,
            };

            const existingIndex = state.drivers.findIndex(d =>
              (cleanPhone && d.phone && d.phone.replace(/[^0-9]/g, '').slice(-10) === cleanPhone) || d.id === driverId
            );

            let updatedDrivers = [...state.drivers];
            if (existingIndex >= 0) {
              updatedDrivers[existingIndex] = { ...updatedDrivers[existingIndex], ...newDriver };
            } else {
              updatedDrivers = [newDriver, ...state.drivers];
            }

            return {
              drivers: updatedDrivers,
              auditLogs: [audit, ...state.auditLogs],
              notifications: [notif, ...state.notifications],
            };
          });

          // Immediately persist to backend MongoDB Atlas
          try {
            const apiBase = getApiBaseUrl();
            fetch(`${apiBase}/auth/driver/complete-onboarding`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: newDriver.fullName,
                fullName: newDriver.fullName,
                phone: newDriver.phone,
                alternatePhone: newDriver.alternatePhone,
                city: newDriver.city,
                vehicleNumber: newDriver.vehicleNumber,
                vehicleType: newDriver.vehicleType,
                upiId: newDriver.upiId,
                pin: newDriver.pin || '1234',
                profilePhoto: newDriver.documents?.profilePhoto,
                aadhaarFront: newDriver.documents?.aadhaarFront,
                licenseFront: newDriver.documents?.licenseFront || newDriver.documents?.drivingLicenseFront,
                vehiclePhoto: newDriver.documents?.vehiclePhoto
              })
            }).catch(() => { });
          } catch (_) { }
        },

        updateDriver: (id, updates) => {
          set((state) => ({
            drivers: state.drivers.map((d) => (d.id === id ? { ...d, ...updates } : d)),
          }));
        },

        deleteDriver: (id) => {
          const target = get().drivers.find((d) => d.id === id || d.phone === id);
          if (target && target.phone) {
            fetch(`${BACKEND_URL}/auth/driver/delete-account`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: target.phone })
            }).catch(() => { });
          }

          set((state) => ({
            drivers: state.drivers.filter((d) => d.id !== id && d.phone !== id),
          }));
        },

        updateDriverStatus: (id, status, notes) => {
          const target = get().drivers.find((d) => d.id === id || (d as any)._id === id || d.phone === id);
          if (target) {
            fetch(`${BACKEND_URL}/drivers/${encodeURIComponent(id)}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status,
                verificationStatus: target.verificationStatus,
                verificationNotes: notes
              })
            }).catch(() => { });
          }

          set((state) => {
            const foundTarget = state.drivers.find((d) => d.id === id || (d as any)._id === id || d.phone === id);
            if (!foundTarget) return {};

            const audit: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `Fleet Admin (${state.currentUserRole})`,
              city: foundTarget.city,
              action: 'Driver Status Updated',
              category: 'COMPLIANCE',
              severity: status === 'Blocked' ? 'WARNING' : 'INFO',
              details: `Driver ${foundTarget.fullName} (${id}) status changed to "${status}". Notes: ${notes || 'N/A'}`,
            };

            return {
              drivers: state.drivers.map((d) =>
                d.id === id || (d as any)._id === id || d.phone === id
                  ? {
                    ...d,
                    status,
                    verificationNotes: notes !== undefined ? notes : d.verificationNotes,
                    isBlocked: status === 'Blocked' || status === 'Suspended',
                  }
                  : d
              ),
              auditLogs: [audit, ...state.auditLogs],
            };
          });
        },

        verifyDriverDocument: (id, docKey, verified) => {
          set((state) => {
            const updatedDrivers = state.drivers.map((d) => {
              if (d.id !== id && (d as any)._id !== id && d.phone !== id) return d;
              const docs = { ...d.documents, [docKey]: verified };
              const allVerified = docs.licenseVerified && docs.aadhaarVerified && docs.panVerified && docs.rcVerified && docs.insuranceVerified;
              const newDriver: LogisticsDriver = {
                ...d,
                documents: docs,
                verificationStatus: (allVerified ? 'Verified' : 'Pending') as VerificationStatus,
                status: allVerified ? 'Active' : d.status,
              };
              fetch(`${BACKEND_URL}/drivers/${encodeURIComponent(id)}/documents`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documents: docs })
              }).catch(() => { });
              return newDriver;
            });
            return { drivers: updatedDrivers };
          });
        },

        verifyAllDriverDocuments: async (id, status, notes) => {
          const target = get().drivers.find((d) => d.id === id || (d as any)._id === id || d.phone === id);
          const isApproved = status === 'Verified';
          const docs = {
            ...(target?.documents || {}),
            licenseVerified: isApproved,
            aadhaarVerified: isApproved,
            panVerified: isApproved,
            rcVerified: isApproved,
            insuranceVerified: isApproved,
            policeVerified: isApproved,
          };

          set((state) => {
            const foundTarget = state.drivers.find((d) => d.id === id || (d as any)._id === id || d.phone === id);
            if (!foundTarget) return {};

            const audit: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `Fleet Admin (${state.currentUserRole})`,
              city: foundTarget.city,
              action: 'Bulk Driver Verification',
              category: 'COMPLIANCE',
              severity: isApproved ? 'INFO' : 'WARNING',
              details: `Set verification status to "${status}" for driver ${foundTarget.fullName} (${id}). Notes: ${notes || 'N/A'}`,
            };

            return {
              drivers: state.drivers.map((d) =>
                d.id === id || (d as any)._id === id || d.phone === id
                  ? {
                    ...d,
                    verificationStatus: status,
                    status: isApproved ? 'Active' : 'Pending Verification',
                    verificationNotes: notes !== undefined ? notes : d.verificationNotes,
                    documents: docs,
                  }
                  : d
              ),
              auditLogs: [audit, ...state.auditLogs],
            };
          });

          try {
            const apiBase = getApiBaseUrl();
            await fetch(`${apiBase}/drivers/${encodeURIComponent(id)}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: isApproved ? 'Active' : 'Pending Verification',
                verificationStatus: status,
                verificationNotes: notes
              })
            });

            await fetch(`${apiBase}/drivers/${encodeURIComponent(id)}/documents`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ documents: docs })
            });
          } catch (_) { }
        },

        toggleBlockDriver: async (id, isBlocked, reason) => {
          const target = get().drivers.find((d) => d.id === id || (d as any)._id === id || d.phone === id);
          const cleanPhone = (target?.phone || id).replace(/[^0-9]/g, '').slice(-10);

          // Record immediate block override to prevent polling race conditions
          const overrideVal = { isBlocked: Boolean(isBlocked), timestamp: Date.now() };
          if (id) recentDriverBlockOverrides.set(id, overrideVal);
          if (target?.id) recentDriverBlockOverrides.set(target.id, overrideVal);
          if ((target as any)?._id) recentDriverBlockOverrides.set((target as any)._id, overrideVal);
          if (cleanPhone) recentDriverBlockOverrides.set(cleanPhone, overrideVal);
          if (target?.phone) recentDriverBlockOverrides.set(target.phone, overrideVal);

          set((state) => {
            const foundTarget = state.drivers.find((d) =>
              d.id === id || (d as any)._id === id || d.phone === id ||
              (cleanPhone && d.phone && d.phone.replace(/[^0-9]/g, '').slice(-10) === cleanPhone)
            );
            if (!foundTarget) return {};

            const audit: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `Super Admin (${state.currentUserRole})`,
              city: foundTarget.city,
              action: isBlocked ? 'Driver Blocked' : 'Driver Unblocked',
              category: 'COMPLIANCE',
              severity: isBlocked ? 'CRITICAL' : 'INFO',
              details: isBlocked
                ? `Driver ${foundTarget.fullName} (${id}) was BLOCKED from accepting deliveries. Reason: ${reason || 'Administrative restriction'}`
                : `Driver ${foundTarget.fullName} (${id}) was UNBLOCKED and restored to active fleet status.`,
            };

            const notif: SystemNotification = {
              id: genId('NOT'),
              title: isBlocked ? 'Driver Suspended / Blocked' : 'Driver Restored',
              message: isBlocked
                ? `Driver ${foundTarget.fullName} (${id}) has been BLOCKED: ${reason || 'Policy breach'}`
                : `Driver ${foundTarget.fullName} (${id}) unblocked successfully.`,
              type: isBlocked ? 'error' : 'success',
              timestamp: new Date().toISOString(),
              read: false,
              city: foundTarget.city,
            };

            return {
              drivers: state.drivers.map((d) => {
                const dClean = (d.phone || '').replace(/[^0-9]/g, '').slice(-10);
                const isMatch = d.id === id || (d as any)._id === id || d.phone === id || (cleanPhone && dClean === cleanPhone);
                if (isMatch) {
                  return {
                    ...d,
                    isBlocked: Boolean(isBlocked),
                    blockedReason: isBlocked ? reason || 'Administrative decision' : '',
                    status: isBlocked ? 'Blocked' : 'Active',
                  };
                }
                return d;
              }),
              auditLogs: [audit, ...state.auditLogs],
              notifications: [notif, ...state.notifications],
            };
          });

          // Immediately persist to backend MongoDB Atlas on port 5001
          try {
            const apiBase = getApiBaseUrl();
            await fetch(`${apiBase}/drivers/${encodeURIComponent(id)}/block`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isBlocked: Boolean(isBlocked), blockedReason: reason, phone: target?.phone || cleanPhone })
            });
          } catch (e) {
            console.warn("Backend driver block sync deferred:", e);
          }
        },

        updateDriverDocuments: async (id, updatedDocs) => {
          try {
            const apiBase = getApiBaseUrl();
            await fetch(`${apiBase}/drivers/${encodeURIComponent(id)}/documents`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ documents: updatedDocs })
            });
          } catch (_) { }

          set((state) => {
            const target = state.drivers.find((d) => d.id === id || (d as any)._id === id || d.phone === id);
            if (!target) return {};

            const audit: AuditLog = {
              id: genId('RB-AUD'),
              timestamp: new Date().toISOString(),
              userRole: state.currentUserRole,
              userName: `Fleet Admin (${state.currentUserRole})`,
              city: target.city,
              action: 'Driver Documents Updated',
              category: 'COMPLIANCE',
              severity: 'INFO',
              details: `Updated document records and KYC files for driver ${target.fullName} (${id}).`,
            };

            return {
              drivers: state.drivers.map((d) =>
                d.id === id
                  ? {
                    ...d,
                    documents: { ...d.documents, ...updatedDocs },
                  }
                  : d
              ),
              auditLogs: [audit, ...state.auditLogs],
            };
          });
        },

        markNotificationRead: (id) => {
          set((state) => ({
            notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
          }));
          try {
            const apiBase = getApiBaseUrl();
            fetch(`${apiBase}/notifications/${id}/read`, { method: 'PUT' }).catch(() => { });
          } catch (_) { }
        },

        markAllNotificationsRead: () => {
          set((state) => ({
            notifications: state.notifications.map(n => ({ ...n, read: true }))
          }));
          try {
            const apiBase = getApiBaseUrl();
            fetch(`${apiBase}/notifications/mark-all-read`, { method: 'PUT' }).catch(() => { });
          } catch (_) { }
        },

        clearNotifications: () => {
          set({ notifications: [] });
          try {
            const apiBase = getApiBaseUrl();
            fetch(`${apiBase}/notifications`, { method: 'DELETE' }).catch(() => { });
          } catch (_) { }
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
                message: 'All local store metrics and cache have been cleared.',
                type: 'success',
                timestamp: new Date().toISOString(),
                read: false,
                city: freshState.currentCity,
              }
            ]
          });
          get().runSystemAudit();
        },

        login: async (username, password) => {
          try {
            set({ loginError: null });
            const res = await fetch(`${BACKEND_URL}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            const token = data.token || data.data?.token || data.data?.access_token;
            const user = data.user || data.data?.user;

            if (data.success && token) {
              set({
                token: token,
                currentUser: user,
                currentUserRole: user?.role || 'Super Admin',
                currentCity: user?.city || 'Indore (Head Office)',
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
          isSyncingFromServer = true;
          try {
            const token = get().token;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }

            const apiBase = getApiBaseUrl();
            const res = await fetch(`${apiBase}/sync/load`, { headers });
            const data = await res.json();

            if (data.success) {
              const db = (data.data && typeof data.data === 'object' && !Array.isArray(data.data) && data.data.drivers)
                ? data.data
                : data;

              const activeCity = localStorage.getItem('rentbuddy_active_city') || get().currentCity || db.currentCity || 'Indore (Head Office)';

              const currentLocalOrders = get().orders || [];
              const serverOrders = (db.orders || []).map((s: any) => {
                const local = currentLocalOrders.find((l: any) => l.id === s.id || l.id === s._id);
                const isPrepared = Boolean(
                  s.isPrepared === true ||
                  s.status === 'READY_FOR_DISPATCH' ||
                  s.status === 'Ready for Dispatch' ||
                  Boolean(s.preparedAt) ||
                  (local && (local.isPrepared === true || local.status === 'Ready for Dispatch'))
                );
                const proof = s.deliveryProofPhoto || s.deliveryProof?.photos?.[0] || s.deliveryProof?.photoUrl || local?.deliveryProofPhoto || '';

                let status = s.status || local?.status || 'Confirmed';
                if (isPrepared && (status === 'CONFIRMED' || status === 'Confirmed' || !status)) {
                  status = 'Ready for Dispatch';
                }

                return {
                  ...(local || {}),
                  ...s,
                  id: s.id || s._id,
                  status,
                  isPrepared,
                  deliveryProofPhoto: proof,
                  city: s.city || local?.city || 'Indore (Head Office)'
                };
              });

              const currentLocalNotifs = get().notifications || [];
              const mergedNotifications = (db.notifications || []).map((srvNotif: any) => {
                const local = currentLocalNotifs.find((l: any) => l.id === srvNotif.id);
                return {
                  ...srvNotif,
                  read: local ? (local.read === true || srvNotif.read === true) : Boolean(srvNotif.read)
                };
              });

              const currentLocalCustomers = get().customers || [];
              const serverCustomers = (db.customers || []).map((sc: any) => ({
                ...sc,
                id: sc.id || sc._id,
                city: sc.city || 'Indore (Head Office)'
              }));
              const mergedCustomers = [...serverCustomers];
              for (const loc of currentLocalCustomers) {
                if (loc && loc.id && !mergedCustomers.some(s => s.id === loc.id || (loc.mobileNumber && s.mobileNumber === loc.mobileNumber))) {
                  mergedCustomers.unshift(loc);
                }
              }

              // Reconcile active and terminated order assets with inventory
              const activeOrderAssetMap = new Map<string, { status: AssetStatus; customerName?: string; orderId: string }>();
              const returnedOrderAssetIds = new Set<string>();

              (serverOrders || []).forEach((ord: any) => {
                const rawStatus = (ord.status || ord.deliveryStatus || '').toString();
                const st = rawStatus.toLowerCase();
                const isTerminated = st === 'returned' || st === 'cancelled' || rawStatus === 'RETURNED' || rawStatus === 'Cancelled';

                (ord.items || []).forEach((it: any) => {
                  const aId = it.assetId || it.id;
                  if (aId) {
                    if (isTerminated) {
                      returnedOrderAssetIds.add(aId);
                    } else {
                      const isDelivered = st === 'delivered' || rawStatus === 'DELIVERED';
                      activeOrderAssetMap.set(aId, {
                        status: (isDelivered ? 'Rented' : 'Reserved') as AssetStatus,
                        customerName: ord.customerName,
                        orderId: ord.id || ord._id
                      });
                    }
                  }
                });
              });

              const currentLocalRepairs = get().repairs || [];
              const serverRepairs = (db.repairs || []).map((sr: any) => {
                const local = currentLocalRepairs.find((l: any) => l.id === sr.id || (l as any)._id === sr._id);
                const effectiveStatus = (local && local.status === 'Completed')
                  ? 'Completed'
                  : (sr.status || 'In Progress');

                return {
                  ...sr,
                  id: sr.id || sr._id,
                  status: effectiveStatus,
                  completedAt: sr.completedAt || (effectiveStatus === 'Completed' ? (local?.completedAt || new Date().toISOString()) : undefined)
                };
              });
              const mergedRepairs = [...serverRepairs];
              for (const loc of currentLocalRepairs) {
                if (loc && loc.id && !mergedRepairs.some(s => s.id === loc.id || (s as any)._id === loc.id)) {
                  mergedRepairs.unshift(loc);
                }
              }

              // Active repairs set to keep asset status strictly 'Under Repair' in POS and Inventory
              const activeRepairAssetIds = new Set<string>();
              mergedRepairs.forEach((rep: any) => {
                if (rep.status === 'In Progress' || rep.status === 'Under Repair') {
                  if (rep.assetId) activeRepairAssetIds.add(rep.assetId);
                  if (rep.assetBarcode) activeRepairAssetIds.add(rep.assetBarcode);
                }
              });

              const syncedAssets = (db.assets || []).map((a: any) => {
                if (activeRepairAssetIds.has(a.id) || activeRepairAssetIds.has(a.barcode) || activeRepairAssetIds.has(a._id)) {
                  return {
                    ...a,
                    status: 'Under Repair' as AssetStatus
                  };
                }
                if (activeOrderAssetMap.has(a.id) || activeOrderAssetMap.has(a._id)) {
                  const activeInfo = activeOrderAssetMap.get(a.id) || activeOrderAssetMap.get(a._id)!;
                  return {
                    ...a,
                    status: activeInfo.status,
                    currentCustomer: activeInfo.customerName || a.currentCustomer,
                    currentOrderId: activeInfo.orderId || a.currentOrderId
                  };
                } else if (returnedOrderAssetIds.has(a.id) || returnedOrderAssetIds.has(a._id)) {
                  if (a.status === 'Rented' || a.status === 'ON_RENT' || a.status === 'Reserved') {
                    return { ...a, status: 'Available' as AssetStatus, currentCustomer: undefined, currentOrderId: undefined };
                  }
                }
                return a;
              });

              const currentLocalDrivers = get().drivers || [];
              const serverDrivers = (db.drivers || []).map((sd: any) => {
                const local = currentLocalDrivers.find((l: any) =>
                  l.id === sd.id || (l as any)._id === sd._id || l.phone === sd.phone
                );
                const cleanPhone = (sd.phone || '').replace(/[^0-9]/g, '').slice(-10);
                const override = recentDriverBlockOverrides.get(sd.id) ||
                  recentDriverBlockOverrides.get(sd._id) ||
                  (cleanPhone ? recentDriverBlockOverrides.get(cleanPhone) : null) ||
                  (sd.phone ? recentDriverBlockOverrides.get(sd.phone) : null);

                // If user toggled block status within last 25 seconds, enforce local override to prevent polling flicker
                const effectiveBlocked = (override && (Date.now() - override.timestamp < 25000))
                  ? override.isBlocked
                  : Boolean(sd.isBlocked || sd.status === 'Blocked' || sd.status === 'Suspended');

                return {
                  ...sd,
                  id: sd.id || sd._id,
                  isBlocked: effectiveBlocked,
                  status: effectiveBlocked ? 'Blocked' : 'Active',
                  blockedReason: sd.blockedReason || local?.blockedReason || ''
                };
              });

              // Overwrite local memory state with synced real MongoDB collections
              set({
                inventory: syncedAssets,
                customers: mergedCustomers,
                orders: serverOrders,
                invoices: db.invoices || [],
                repairs: mergedRepairs,
                auditLogs: db.auditLogs || [],
                notifications: mergedNotifications,
                drivers: serverDrivers,
                cities: db.cities && db.cities.length > 0 ? db.cities : get().cities,
                currentCity: activeCity,
                currentUserRole: db.currentUserRole || get().currentUserRole,
                expectedVsActualAudit: db.expectedVsActualAudit || {
                  expectedCount: syncedAssets.length,
                  actualCount: syncedAssets.length,
                  missingCount: 0,
                  duplicateBarcodes: [],
                  fraudAlertCount: 0,
                }
              });
              console.log(`[RentBuddy Sync] Live MongoDB sync complete: ${db.drivers?.length || 0} drivers, ${db.assets?.length || 0} assets, ${db.customers?.length || 0} customers.`);
            }
          } catch (err: any) {
            console.warn("MongoDB synchronization offline or error:", err.message);
          } finally {
            setTimeout(() => {
              isSyncingFromServer = false;
            }, 500);
          }
        }
      };
    },
    {
      name: 'rentbuddy-erp-live-atlas',
    }
  )
);

// Replicate Zustand store updates to MongoDB Atlas on changes
useRentBuddyStore.subscribe((state) => {
  if (!isSyncingFromServer) {
    syncToDatabase(state);
  }
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

export const initialCities = [
  'Indore (Head Office)',
  'Bhopal',
  'Surat',
  'Ahmedabad'
];

export const initialCustomers = [
  {
    id: 'RB-CUST-1001',
    fullName: 'Rahul Sharma',
    mobileNumber: '9826012345',
    email: 'rahul.sharma@example.com',
    deliveryAddress: 'Flat 402, Lotus Pride, Vijay Nagar',
    city: 'Indore (Head Office)',
    securityDeposit: 5000,
    status: 'Verified',
    verificationStatus: 'Verified',
    documents: {
      aadhaarFront: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300',
      aadhaarBack: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300',
      panCard: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300',
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'RB-CUST-1002',
    fullName: 'Priya Patel',
    mobileNumber: '9879123456',
    email: 'priya.patel@example.com',
    deliveryAddress: 'B-12, Vesu Royal Homes, Vesu',
    city: 'Surat',
    securityDeposit: 6500,
    status: 'Verified',
    verificationStatus: 'Verified',
    documents: {
      aadhaarFront: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
      aadhaarBack: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
      panCard: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'RB-CUST-1003',
    fullName: 'Amitabh Verma',
    mobileNumber: '9425098765',
    email: 'amitabh.verma@example.com',
    deliveryAddress: '15, Arera Colony, Near Bittan Market',
    city: 'Bhopal',
    securityDeposit: 4500,
    status: 'Verified',
    verificationStatus: 'Verified',
    documents: {
      aadhaarFront: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
      aadhaarBack: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
      panCard: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'RB-CUST-1004',
    fullName: 'Ananya Desai',
    mobileNumber: '9898011223',
    email: 'ananya.desai@example.com',
    deliveryAddress: 'Tower 3, Prahlad Nagar Highs',
    city: 'Ahmedabad',
    securityDeposit: 7000,
    status: 'Verified',
    verificationStatus: 'Verified',
    documents: {
      aadhaarFront: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      aadhaarBack: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      panCard: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    },
    createdAt: new Date().toISOString()
  }
];

export const initialAssets = [
  {
    id: 'RB-AST-101',
    name: 'Ergonomic Executive Office Chair',
    category: 'Furniture',
    monthlyRent: 450,
    securityDeposit: 1500,
    status: 'Available',
    barcode: 'RB-BAR-101',
    warehouse: 'Indore (Head Office)',
    city: 'Indore (Head Office)',
    condition: 'Excellent',
    imageUrl: 'https://images.unsplash.com/photo-1580481077195-c3a82da91841?auto=format&fit=crop&q=80&w=400',
    lifecycle: { totalRents: 3, totalRepairs: 0, purchaseDate: '2025-01-15' }
  },
  {
    id: 'RB-AST-102',
    name: 'Solid Teak Wood Dining Table (4 Seater)',
    category: 'Furniture',
    monthlyRent: 850,
    securityDeposit: 3000,
    status: 'Available',
    barcode: 'RB-BAR-102',
    warehouse: 'Indore (Head Office)',
    city: 'Indore (Head Office)',
    condition: 'Good',
    imageUrl: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&q=80&w=400',
    lifecycle: { totalRents: 2, totalRepairs: 1, purchaseDate: '2025-02-10' }
  },
  {
    id: 'RB-AST-103',
    name: 'Double Door Frost-Free Refrigerator (260L)',
    category: 'Appliances',
    monthlyRent: 950,
    securityDeposit: 3500,
    status: 'Available',
    barcode: 'RB-BAR-103',
    warehouse: 'Bhopal',
    city: 'Bhopal',
    condition: 'Excellent',
    imageUrl: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&q=80&w=400',
    lifecycle: { totalRents: 4, totalRepairs: 0, purchaseDate: '2025-01-20' }
  },
  {
    id: 'RB-AST-104',
    name: 'Fully Automatic Washing Machine (7.5kg)',
    category: 'Appliances',
    monthlyRent: 800,
    securityDeposit: 3000,
    status: 'Available',
    barcode: 'RB-BAR-104',
    warehouse: 'Bhopal',
    city: 'Bhopal',
    condition: 'Good',
    imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&q=80&w=400',
    lifecycle: { totalRents: 1, totalRepairs: 0, purchaseDate: '2025-03-01' }
  },
  {
    id: 'RB-AST-105',
    name: 'Ultra-HD Smart LED TV (50 Inch)',
    category: 'Electronics',
    monthlyRent: 1200,
    securityDeposit: 4000,
    status: 'Available',
    barcode: 'RB-BAR-105',
    warehouse: 'Surat',
    city: 'Surat',
    condition: 'Excellent',
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=400',
    lifecycle: { totalRents: 5, totalRepairs: 0, purchaseDate: '2025-01-10' }
  },
  {
    id: 'RB-AST-106',
    name: 'Queen Size Wooden Bed with Orthopedic Mattress',
    category: 'Furniture',
    monthlyRent: 900,
    securityDeposit: 3000,
    status: 'Available',
    barcode: 'RB-BAR-106',
    warehouse: 'Ahmedabad',
    city: 'Ahmedabad',
    condition: 'Excellent',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=400',
    lifecycle: { totalRents: 3, totalRepairs: 0, purchaseDate: '2025-02-15' }
  }
];

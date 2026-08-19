import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 5001;
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_rentbuddy_2026_!!';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ImageKit Configuration
export const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || '';
export const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || '';
export const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT || '';

// System User Roles
export const USER_ROLES = [
  'Super Admin',
  'Operations Manager',
  'Warehouse Manager',
  'Logistics Team',
  'Repair Team',
  'Finance',
  'Customer Support',
  'Read-only Auditor'
];

export const DEFAULT_ADMIN = {
  username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
  password: process.env.DEFAULT_ADMIN_PASSWORD || 'RentbuddySecure2026!',
  fullName: 'Ashish Admin',
  role: 'Super Admin',
  city: 'Indore (Head Office)'
};

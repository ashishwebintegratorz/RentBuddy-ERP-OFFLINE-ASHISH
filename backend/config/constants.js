import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 5001;
export const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is strictly required in production.');
}

export const JWT_SECRET = process.env.JWT_SECRET || (NODE_ENV === 'production' ? '' : 'dev_jwt_secret_rentbuddy_local_only');
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// CORS Allowed Origins
export const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ImageKit Configuration
export const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || '';
export const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || '';
export const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT || '';

// Google Maps Platform Configuration (Mobile Rider App & Live Tracking)
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCN7XqyxOj5lgr2uaMNrTOg6PzHTOGa0xU';

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
  password: process.env.DEFAULT_ADMIN_PASSWORD || '',
  fullName: process.env.DEFAULT_ADMIN_NAME || 'RentBuddy Administrator',
  role: 'Super Admin',
  city: 'Indore (Head Office)'
};

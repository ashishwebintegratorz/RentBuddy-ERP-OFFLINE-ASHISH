/**
 * Centralized API Client and Base URL Resolver
 * Resolves VITE_API_URL or defaults to relative /api/v1 for reverse proxy/production
 */

export const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, '');
  }
  // In local browser development where backend runs on port 5001
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5001/api/v1';
  }
  return '/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

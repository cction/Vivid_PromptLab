import axios from 'axios';

// API base URL configuration
// In development (vite dev server): use localhost:3001
// In production (docker/nginx): use relative path (nginx proxies to backend)
const isDev = import.meta.env.DEV;
const API_BASE_URL = isDev ? 'http://localhost:3001' : '';

// Create axios instance with base URL
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Helper to get full image URL
export function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // For relative paths like /uploads/xxx.jpg
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export default api;


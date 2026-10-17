import axios from 'axios';

/**
 * NeuroMind Core API Client
 * 
 * Bridges the React frontend with the Python/FastAPI Backend.
 * Ensures all requests carry the Clerk authentication token if available.
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to inject the Clerk Token into requests
export const setupAxiosInterceptors = (getToken: () => Promise<string | null>) => {
  apiClient.interceptors.request.use(
    async (config) => {
      try {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error attaching Auth token to request:', error);
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};

export default apiClient;

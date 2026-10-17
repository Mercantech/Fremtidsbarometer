import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

export const getAdminKey = (): string => {
  return localStorage.getItem('admin_api_key') || '';
};

export const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminApi.interceptors.request.use((config) => {
  const key = getAdminKey();
  if (key) {
    config.headers['x-api-key'] = key;
  } else {
    delete config.headers['x-api-key'];
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Admin API: Unauthorized - Invalid or missing API key');
    } else if (error.message === 'Network Error') {
      console.error('Admin API: Network Error - Backend might be unreachable');
    }
    return Promise.reject(error);
  }
);

export const getAdminErrorMessage = (error: unknown, fallback: string = 'Operation failed'): string => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
    }
    if (detail && typeof detail === 'object') {
      return JSON.stringify(detail);
    }
    if (error.response?.data?.message) {
      return String(error.response.data.message);
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

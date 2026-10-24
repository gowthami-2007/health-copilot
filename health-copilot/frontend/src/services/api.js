import axios from 'axios';

let inMemoryAuthToken = null;

export const setAuthToken = (token) => {
  inMemoryAuthToken = token;
};

export const getAuthToken = () => inMemoryAuthToken;

export const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // When running on Vercel (https://health-copilot-pearl.vercel.app), use relative '/api'
  // so requests are proxied via vercel.json. This prevents Brave Shields & Safari ITP from
  // blocking cross-origin cookies between vercel.app and onrender.com!
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname.includes('vercel.app')
  ) {
    return '/api';
  }
  return 'https://health-copilot-pv0y.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 45000,
});

// Request Interceptor: Attach credentials
api.interceptors.request.use(
  (config) => {
    // Attach in-memory token as Bearer header if available
    if (inMemoryAuthToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${inMemoryAuthToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global error interception
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data;
    const message =
      errorData?.message ||
      (typeof errorData?.error === 'object' ? errorData?.error?.message : null) ||
      error.message ||
      'An unexpected error occurred';

    const code =
      errorData?.errorCode ||
      (typeof errorData?.error === 'object' ? errorData?.error?.code : errorData?.error) ||
      'UNKNOWN_ERROR';

    return Promise.reject({
      message,
      status: error.response?.status || 500,
      code,
      errorCode: code,
      error: errorData?.error || code,
      details: errorData?.details || null,
      data: errorData?.data || null,
    });
  }
);

export default api;

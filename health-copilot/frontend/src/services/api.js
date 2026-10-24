import axios from 'axios';

let inMemoryAuthToken = null;

export const setAuthToken = (token) => {
  inMemoryAuthToken = token;
};

export const getAuthToken = () => inMemoryAuthToken;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://health-copilot-pv0y.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 45000,
});

// Request Interceptor: Attach credentials
api.interceptors.request.use(
  (config) => {
    // If in-memory token is present, attach Bearer header as reliable cross-domain fallback
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
    const message = errorData?.message || error.message || 'An unexpected error occurred';

    return Promise.reject({
      message,
      status: error.response?.status || 500,
      code: errorData?.error || 'UNKNOWN_ERROR',
      details: errorData?.details || null,
      data: errorData?.data || null,
    });
  }
);

export default api;

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('health_copilot_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    
    // Auto logout on 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('health_copilot_token');
      localStorage.removeItem('health_copilot_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }

    return Promise.reject({
      message,
      status: error.response?.status || 500,
      code: errorData?.error || 'UNKNOWN_ERROR',
      details: errorData?.details || null,
    });
  }
);

export default api;

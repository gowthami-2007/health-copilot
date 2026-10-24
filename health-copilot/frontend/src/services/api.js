import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://health-copilot-pv0y.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 45000,
});

// Request Interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response Interceptor: Global error interception
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data;
    const message = errorData?.message || error.message || 'An unexpected error occurred';
    const isAuthProbe = error.config?.url?.includes('/auth/me');

    // On 401 Unauthorized for protected pages (excluding session check probe or public pages)
    if (error.response?.status === 401 && !isAuthProbe) {
      const publicPaths = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/'];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login';
      }
    }

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

import React, { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('health_copilot_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('health_copilot_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate session on mount
  const checkAuth = useCallback(async () => {
    const currentToken = localStorage.getItem('health_copilot_token');
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const response = await authService.getMe();
      if (response?.data?.user) {
        setUser(response.data.user);
        localStorage.setItem('health_copilot_user', JSON.stringify(response.data.user));
      }
    } catch (err) {
      console.warn('Session verification failed:', err.message);
      setUser(null);
      setToken(null);
      localStorage.removeItem('health_copilot_token');
      localStorage.removeItem('health_copilot_user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await authService.login({ email, password });
      const { user: userData, token: userToken } = res.data;
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('health_copilot_token', userToken);
      localStorage.setItem('health_copilot_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (name, email, password, confirmPassword) => {
    setError(null);
    try {
      const res = await authService.register({ name, email, password, confirmPassword });
      const { user: userData, token: userToken } = res.data;
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('health_copilot_token', userToken);
      localStorage.setItem('health_copilot_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('health_copilot_token');
      localStorage.removeItem('health_copilot_user');
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    checkAuth,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

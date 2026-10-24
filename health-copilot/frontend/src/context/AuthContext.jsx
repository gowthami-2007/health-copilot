import React, { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { setAuthToken } from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate session on mount via HTTP-only cookie and restore session
  const checkAuth = useCallback(async () => {
    try {
      const response = await authService.getMe();
      const payload = response?.data || response;
      const userData = payload?.user;
      const tokenData = payload?.token;

      if (userData) {
        setUser(userData);
        if (tokenData) {
          setToken(tokenData);
          setAuthToken(tokenData);
        }
      } else {
        setUser(null);
        setToken(null);
        setAuthToken(null);
      }
    } catch {
      // 401 or network error -> treat as unauthenticated
      setUser(null);
      setToken(null);
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password, rememberMe = true) => {
    setError(null);
    try {
      const res = await authService.login({ email, password, rememberMe });
      const payload = res.data || res;
      const userData = payload.user || payload;
      setUser(userData);
      if (payload.token) {
        setToken(payload.token);
        setAuthToken(payload.token);
      }
      return userData;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const googleLogin = async (idToken) => {
    setError(null);
    try {
      const res = await authService.googleAuth(idToken);
      const payload = res.data || res;
      const userData = payload.user || payload;
      setUser(userData);
      if (payload.token) {
        setToken(payload.token);
        setAuthToken(payload.token);
      }
      return userData;
    } catch (err) {
      setError(err.message || 'Google authentication failed');
      throw err;
    }
  };

  const register = async (name, email, password, confirmPassword) => {
    setError(null);
    try {
      const res = await authService.register({ name, email, password, confirmPassword });
      const payload = res.data || res;
      if (payload?.user) {
        setUser(payload.user);
      }
      if (payload?.token) {
        setToken(payload.token);
        setAuthToken(payload.token);
      }
      return payload;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const verifyEmail = async ({ token: verifyToken, code, email }) => {
    setError(null);
    try {
      const res = await authService.verifyEmail({ token: verifyToken, code, email });
      const payload = res.data || res;
      if (payload?.user) {
        setUser(payload.user);
      }
      if (payload?.token) {
        setToken(payload.token);
        setAuthToken(payload.token);
      }
      return payload;
    } catch (err) {
      setError(err.message || 'Verification failed');
      throw err;
    }
  };

  const resendVerification = async (email) => {
    return await authService.resendVerification(email);
  };

  const resendOtp = async (email) => {
    return await authService.resendOtp(email);
  };

  const forgotPassword = async (email) => {
    return await authService.forgotPassword(email);
  };

  const resetPassword = async ({ token: resetToken, password, confirmPassword }) => {
    return await authService.resetPassword({ token: resetToken, password, confirmPassword });
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Continue even if network error on logout
    } finally {
      setUser(null);
      setToken(null);
      setAuthToken(null);
      try {
        localStorage.removeItem('health_copilot_token');
        localStorage.removeItem('health_copilot_user');
      } catch {}
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: Boolean(user),
    login,
    googleLogin,
    register,
    verifyEmail,
    resendVerification,
    resendOtp,
    forgotPassword,
    resetPassword,
    logout,
    checkAuth,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, type AuthResponse, type RegisterData, type LoginData, type GoogleIdTokenData } from '../api/auth';
import { tokenManager } from './tokens';

interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  loginWithGoogle: (code: string, redirectUri?: string) => Promise<void>;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  startGoogleLogin: () => Promise<string>;
  refreshTokens: () => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const clearAuth = useCallback(() => {
    setUser(null);
    tokenManager.clearTokens();
  }, []);

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    if (isRefreshing) return false;

    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      clearAuth();
      return false;
    }

    try {
      setIsRefreshing(true);
      const response = await authApi.refresh({ refreshToken });

      if (response.success && response.data) {
        tokenManager.storeTokens(
          response.data.accessToken,
          response.data.refreshToken
        );
        setUser(response.data.user);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuth();
    } finally {
      setIsRefreshing(false);
    }

    return false;
  }, [isRefreshing, clearAuth]);

  const checkAuthStatus = useCallback(async () => {
    const accessToken = tokenManager.getAccessToken();

    if (!accessToken) {
      setLoading(false);
      return;
    }

    // Check if token needs refresh
    if (tokenManager.shouldRefreshToken(accessToken)) {
      const refreshed = await refreshTokens();
      if (!refreshed) {
        setLoading(false);
        return;
      }
    }

    // Get current user info
    try {
      const response = await authApi.me();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        clearAuth();
      }
    } catch (error) {
      console.error('Failed to get user info:', error);

      // Try to refresh tokens once more
      const refreshed = await refreshTokens();
      if (!refreshed) {
        clearAuth();
      }
    }

    setLoading(false);
  }, [refreshTokens, clearAuth]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Set up automatic token refresh
  useEffect(() => {
    const interval = setInterval(() => {
      const accessToken = tokenManager.getAccessToken();
      if (accessToken && tokenManager.shouldRefreshToken(accessToken)) {
        refreshTokens();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [refreshTokens]);

  const login = async (data: LoginData): Promise<void> => {
    const response = await authApi.login(data);

    if (response.success && response.data) {
      tokenManager.storeTokens(
        response.data.accessToken,
        response.data.refreshToken
      );
      setUser(response.data.user);
    } else {
      throw new Error(response.error || 'Login failed');
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    const response = await authApi.register(data);

    if (response.success && response.data) {
      tokenManager.storeTokens(
        response.data.accessToken,
        response.data.refreshToken
      );
      setUser(response.data.user);
    } else {
      throw new Error(response.error || 'Registration failed');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
    clearAuth();
  };

  const logoutAll = async (): Promise<void> => {
    try {
      await authApi.logoutAll();
    } catch (error) {
      console.error('Logout all API call failed:', error);
    }
    clearAuth();
  };

  const startGoogleLogin = async (): Promise<string> => {
    const response = await authApi.googleStart();

    if (response.success && response.data?.url) {
      return response.data.url;
    } else {
      throw new Error(response.error || 'Failed to start Google login');
    }
  };

  const loginWithGoogle = async (code: string, redirectUri?: string): Promise<void> => {
    const response = await authApi.googleCallback({ code, redirectUri });

    if (response.success && response.data) {
      tokenManager.storeTokens(
        response.data.accessToken,
        response.data.refreshToken
      );
      setUser(response.data.user);
    } else {
      throw new Error(response.error || 'Google login failed');
    }
  };

  const loginWithGoogleIdToken = async (idToken: string): Promise<void> => {
    const response = await authApi.googleIdToken({ idToken });

    if (response.success && response.data) {
      tokenManager.storeTokens(
        response.data.accessToken,
        response.data.refreshToken
      );
      setUser(response.data.user);
    } else {
      throw new Error(response.error || 'Google login failed');
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    logoutAll,
    loginWithGoogle,
    loginWithGoogleIdToken,
    startGoogleLogin,
    refreshTokens,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { User, AuthContextType };
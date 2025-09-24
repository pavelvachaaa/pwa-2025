'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, type RegisterData, type LoginData, type GoogleIdTokenData, type User } from '../api/auth';
import { tokenManager } from './tokens';


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
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setUser(null);
    tokenManager.clearTokens();
  }, []);


  const checkAuthStatus = useCallback(async () => {
    const accessToken = tokenManager.getAccessToken();

    if (!accessToken) {
      setLoading(false);
      return;
    }

    // Get current user info - interceptor handles token refresh
    try {
      const response = await authApi.me();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        clearAuth();
      }
    } catch (error) {
      console.error('Failed to get user info:', error);
      clearAuth();
    }

    setLoading(false);
  }, [clearAuth]);

  useEffect(() => {
    checkAuthStatus();

    // Listen for automatic logout from API interceptor
    const handleLogout = () => {
      clearAuth();
      window.location.href = '/auth/login';
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [checkAuthStatus, clearAuth]);


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
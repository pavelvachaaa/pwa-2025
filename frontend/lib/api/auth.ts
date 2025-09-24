import { api, type ApiResponse } from './api';

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface GoogleCallbackData {
  code: string;
  redirectUri?: string;
}

export interface GoogleIdTokenData {
  idToken: string;
}

export const authApi = {
  async register(data: RegisterData): Promise<ApiResponse<AuthData>> {
    return api.post<AuthData>('/auth/register', data);
  },

  async login(data: LoginData): Promise<ApiResponse<AuthData>> {
    return api.post<AuthData>('/auth/login', data);
  },

  async googleStart(): Promise<ApiResponse<{ url: string }>> {
    return api.post<{ url: string }>('/auth/google/start');
  },

  async googleCallback(data: GoogleCallbackData): Promise<ApiResponse<AuthData>> {
    return api.post<AuthData>('/auth/google/callback', data);
  },

  async googleIdToken(data: GoogleIdTokenData): Promise<ApiResponse<AuthData>> {
    return api.post<AuthData>('/auth/google/id-token', data);
  },

  async logout(): Promise<ApiResponse> {
    return api.post('/auth/logout', {}, { skipRetry: true });
  },

  async logoutAll(): Promise<ApiResponse> {
    return api.post('/auth/logout-all', {}, { skipRetry: true });
  },

  async me(): Promise<ApiResponse<User>> {
    return api.get<User>('/auth/me');
  }
} as const;
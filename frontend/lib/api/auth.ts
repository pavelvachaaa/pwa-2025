const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

interface AuthResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface RegisterData {
  email: string;
  password: string;
  displayName: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface GoogleCallbackData {
  code: string;
  redirectUri?: string;
}

interface GoogleIdTokenData {
  idToken: string;
}

interface RefreshTokenData {
  refreshToken: string;
}

class AuthApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: this.getAuthHeaders(),
        ...options
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async googleStart(): Promise<AuthResponse> {
    return this.makeRequest('/auth/google/start', {
      method: 'POST'
    });
  }

  async googleCallback(data: GoogleCallbackData): Promise<AuthResponse> {
    return this.makeRequest('/auth/google/callback', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async googleIdToken(data: GoogleIdTokenData): Promise<AuthResponse> {
    return this.makeRequest('/auth/google/id-token', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async refresh(data: RefreshTokenData): Promise<AuthResponse> {
    return this.makeRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  async logoutAll(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout-all', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout all failed:', error);
    }
  }

  async me(): Promise<AuthResponse> {
    return this.makeRequest('/auth/me');
  }
}

export const authApi = new AuthApiClient();
export type { AuthResponse, RegisterData, LoginData, GoogleCallbackData, GoogleIdTokenData, RefreshTokenData };
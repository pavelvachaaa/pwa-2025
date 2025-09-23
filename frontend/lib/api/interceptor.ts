import { tokenManager } from '../auth/tokens';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

class ApiClient {
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });

    this.failedQueue = [];
  }

  private async refreshToken(): Promise<string | null> {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        tokenManager.storeTokens(
          data.data.accessToken,
          data.data.refreshToken
        );
        return data.data.accessToken;
      } else {
        tokenManager.clearTokens();
        return null;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      tokenManager.clearTokens();
      return null;
    }
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const makeRequest = async (token?: string): Promise<Response> => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });
    };

    try {
      let accessToken = tokenManager.getAccessToken();
      let response = await makeRequest(accessToken || undefined);

      // If token expired, try to refresh
      if (response.status === 401) {
        const data = await response.json();

        if (data.code === 'TOKEN_EXPIRED') {
          if (this.isRefreshing) {
            // If already refreshing, wait for the current refresh to complete
            return new Promise<ApiResponse<T>>((resolve, reject) => {
              this.failedQueue.push({
                resolve: async (token: string) => {
                  try {
                    const retryResponse = await makeRequest(token);
                    const retryData = await retryResponse.json();
                    resolve(retryData);
                  } catch (error) {
                    reject(error);
                  }
                },
                reject
              });
            });
          }

          this.isRefreshing = true;

          try {
            const newToken = await this.refreshToken();

            if (newToken) {
              this.processQueue(null, newToken);
              response = await makeRequest(newToken);
            } else {
              this.processQueue(new Error('Token refresh failed'), null);
              return await response.json();
            }
          } catch (error) {
            this.processQueue(error, null);
            throw error;
          } finally {
            this.isRefreshing = false;
          }
        }
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export type { ApiResponse };
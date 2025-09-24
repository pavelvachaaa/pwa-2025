const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, any> | string;
  params?: Record<string, string>;
  requiresAuth?: boolean;
  skipRetry?: boolean; // Skip automatic retry on auth failure
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
    config: { url: string; options: RequestOptions };
  }> = [];

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Include cookies
      });

      // If no refresh token cookie exists, don't try to refresh
      if (response.status === 401) {
        return false;
      }

      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  private processQueue(error?: any): void {
    this.failedQueue.forEach(({ resolve, reject, config }) => {
      if (error) {
        reject(error);
      } else {
        resolve(this.request(config.url, config.options));
      }
    });

    this.failedQueue = [];
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }

  private getHeaders(options: RequestOptions = {}): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Merge with custom headers
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP Error: ${response.status}`,
          data: data.details || undefined
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse response',
        data: undefined
      };
    }
  }

  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { body, params, requiresAuth, skipRetry, ...fetchOptions } = options;

    // If we're currently refreshing tokens and this isn't the refresh request
    if (this.isRefreshing && !endpoint.includes('/auth/refresh')) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({
          resolve,
          reject,
          config: { url: endpoint, options }
        });
      });
    }

    try {
      const url = this.buildUrl(endpoint, params);
      const headers = this.getHeaders(options);

      const config: RequestInit = {
        ...fetchOptions,
        headers,
        credentials: 'include', // Always include cookies
      };

      // Handle body serialization
      if (body) {
        if (typeof body === 'string') {
          config.body = body;
        } else {
          config.body = JSON.stringify(body);
        }
      }

      const response = await fetch(url, config);
      const result = await this.handleResponse<T>(response);

      // Handle 401 Unauthorized - attempt token refresh
      if (!result.success &&
          response.status === 401 &&
          !skipRetry &&
          !endpoint.includes('/auth/refresh') &&
          requiresAuth !== false) {

        if (!this.isRefreshing) {
          this.isRefreshing = true;

          try {
            const refreshSuccess = await this.refreshAccessToken();

            if (refreshSuccess) {
              this.processQueue(); // Retry queued requests
              // Retry the original request with new token
              return this.request<T>(endpoint, { ...options, skipRetry: true });
            } else {
              // Refresh failed - trigger logout
              this.processQueue(new Error('Authentication expired'));

              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:logout'));
              }
            }
          } finally {
            this.isRefreshing = false;
          }
        }
      }

      return result;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        data: undefined
      };
    }
  }

  async get<T = any>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: Record<string, any>, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T = any>(endpoint: string, body?: Record<string, any>, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async patch<T = any>(endpoint: string, body?: Record<string, any>, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  async delete<T = any>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
export { ApiClient };
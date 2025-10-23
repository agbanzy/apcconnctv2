import Constants from 'expo-constants';
import { storage } from './storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.API_URL || 'http://localhost:5000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await storage.getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await storage.getRefreshToken();
        if (!refreshToken) {
          return false;
        }

        const response = await fetch(`${this.baseURL}/api/auth/mobile/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          await storage.clearAll();
          return false;
        }

        const result: ApiResponse<{ accessToken: string; refreshToken: string }> = await response.json();
        
        if (result.success && result.data) {
          await storage.setAccessToken(result.data.accessToken);
          await storage.setRefreshToken(result.data.refreshToken);
          return true;
        }

        return false;
      } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseURL}${endpoint}`;

      let response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken();
        
        if (refreshed) {
          const newHeaders = await this.getAuthHeaders();
          response = await fetch(url, {
            ...options,
            headers: {
              ...newHeaders,
              ...options.headers,
            },
          });
        } else {
          return {
            success: false,
            error: 'Session expired. Please login again.',
          };
        }
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Request failed with status ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network request failed',
      };
    }
  }

  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const api = new ApiClient(API_URL);

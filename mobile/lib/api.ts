import Constants from 'expo-constants';
import { storage } from './storage';

const rawApiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.API_URL ||
  'http://localhost:5000';

const API_URL = rawApiUrl.replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 15000;

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

  private async getAuthHeaders(options: RequestInit): Promise<HeadersInit> {
    const token = await storage.getAccessToken();
    const headers: HeadersInit = {};

    const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (!isFormDataBody) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
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

        const response = await this.fetchWithTimeout(`${this.baseURL}/api/auth/mobile/refresh`, {
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
      const headers = await this.getAuthHeaders(options);
      const url = `${this.baseURL}${endpoint}`;

      let response = await this.fetchWithTimeout(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const isMobileAuthEndpoint = endpoint.startsWith('/api/auth/mobile/');
      const hasRefreshToken = !!(await storage.getRefreshToken());

      if (response.status === 401 && !isMobileAuthEndpoint && hasRefreshToken) {
        const refreshed = await this.refreshAccessToken();

        if (refreshed) {
          const newHeaders = await this.getAuthHeaders(options);
          response = await this.fetchWithTimeout(url, {
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

      const rawResponse = await response.text();
      let data: any = {};
      if (rawResponse) {
        try {
          data = JSON.parse(rawResponse);
        } catch {
          data = { error: rawResponse };
        }
      }

      if (!response.ok) {
        return {
          success: false,
          error:
            data?.error ||
            data?.message ||
            `Request failed with status ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      console.error('API request failed:', error);
      return {
        success: false,
        error: isAbortError
          ? 'Request timed out. Please check your internet connection and try again.'
          : error instanceof Error
            ? error.message
            : 'Network request failed',
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

  async upload<T = any>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }
}

export const api = new ApiClient(API_URL);

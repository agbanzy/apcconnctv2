import { api, ApiResponse } from './api';
import { storage } from './storage';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  wardId: string;
  referralCode?: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  member: {
    id: string;
    memberId: string;
    status: string;
    referralCode: string;
  };
  accessToken: string;
  refreshToken: string;
}

export const auth = {
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResult>> {
    const response = await api.post<AuthResult>('/api/auth/mobile/login', credentials);
    
    if (response.success && response.data) {
      await storage.setAccessToken(response.data.accessToken);
      await storage.setRefreshToken(response.data.refreshToken);
      await storage.setUserData({
        user: response.data.user,
        member: response.data.member,
      });
    }
    
    return response;
  },

  async register(data: RegisterData): Promise<ApiResponse<AuthResult>> {
    const response = await api.post<AuthResult>('/api/auth/mobile/register', data);
    
    if (response.success && response.data) {
      await storage.setAccessToken(response.data.accessToken);
      await storage.setRefreshToken(response.data.refreshToken);
      await storage.setUserData({
        user: response.data.user,
        member: response.data.member,
      });
    }
    
    return response;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/mobile/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await storage.clearAll();
    }
  },

  async getAccessToken(): Promise<string | null> {
    return await storage.getAccessToken();
  },

  async getRefreshToken(): Promise<string | null> {
    return await storage.getRefreshToken();
  },

  async getUserData(): Promise<any | null> {
    return await storage.getUserData();
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await storage.getAccessToken();
    return !!token;
  },

  async refreshToken(): Promise<boolean> {
    const refreshToken = await storage.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    const response = await api.post<{ accessToken: string; refreshToken: string }>(
      '/api/auth/mobile/refresh',
      { refreshToken }
    );

    if (response.success && response.data) {
      await storage.setAccessToken(response.data.accessToken);
      await storage.setRefreshToken(response.data.refreshToken);
      return true;
    }

    await storage.clearAll();
    return false;
  },
};

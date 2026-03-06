import { httpClient } from '@/shared/api';
import {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  StatusResponse,
} from '../model/types';

/**
 * 認証API
 */
export const authApi = {
  /**
   * ログイン
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>(
      '/auth/login',
      credentials,
    );
    return response.data;
  },

  /**
   * ログアウト
   */
  async logout(): Promise<LogoutResponse> {
    const response = await httpClient.post<LogoutResponse>('/auth/logout');
    return response.data;
  },

  /**
   * 認証状態取得
   */
  async getAuthStatus(): Promise<StatusResponse> {
    const response = await httpClient.get<StatusResponse>('/auth/status');
    return response.data;
  },
};

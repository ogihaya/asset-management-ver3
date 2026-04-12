import { httpClient } from '@/shared/api';
import {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  StatusResponse,
} from '../model/types';

const AUTH_API_BASE_PATH = '/api/v1/auth';

/**
 * 認証API
 */
export const authApi = {
  /**
   * ログイン
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>(
      `${AUTH_API_BASE_PATH}/login`,
      credentials,
    );
    return response.data;
  },

  /**
   * ログアウト
   */
  async logout(): Promise<LogoutResponse> {
    const response = await httpClient.post<LogoutResponse>(
      `${AUTH_API_BASE_PATH}/logout`,
    );
    return response.data;
  },

  /**
   * 認証状態取得
   */
  async getAuthStatus(): Promise<StatusResponse> {
    const response = await httpClient.get<StatusResponse>(
      `${AUTH_API_BASE_PATH}/status`,
    );
    return response.data;
  },
};

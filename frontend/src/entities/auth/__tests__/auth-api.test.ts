import { server } from '@/__mocks__/server';
import {
  createLoginErrorHandler,
  createLogoutErrorHandler,
  createAuthStatusHandler,
} from '@/__mocks__/handlers';
import { authApi } from '../api/auth-api';

describe('authApi', () => {
  describe('login', () => {
    it('正しい認証情報でログイン成功', async () => {
      const result = await authApi.login({
        login_id: 'admin',
        password: 'password',
      });

      expect(result).toEqual({
        message: 'ログイン成功',
        access_token: 'test_token',
        user_id: 1,
      });
    });

    it('不正な認証情報で401エラー', async () => {
      server.use(createLoginErrorHandler(401));

      await expect(
        authApi.login({
          login_id: 'wrong',
          password: 'wrong',
        }),
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('ログアウト成功', async () => {
      const result = await authApi.logout();

      expect(result).toEqual({
        message: 'ログアウトしました',
      });
    });

    it('ログアウト失敗でエラー', async () => {
      server.use(createLogoutErrorHandler(500));

      await expect(authApi.logout()).rejects.toThrow();
    });
  });

  describe('getAuthStatus', () => {
    it('認証済みユーザーの場合', async () => {
      server.use(createAuthStatusHandler(true));

      const result = await authApi.getAuthStatus();

      expect(result).toEqual({
        is_authenticated: true,
        user_id: 1,
      });
    });

    it('未認証ユーザーの場合', async () => {
      server.use(createAuthStatusHandler(false));

      await expect(authApi.getAuthStatus()).rejects.toThrow();
    });
  });
});

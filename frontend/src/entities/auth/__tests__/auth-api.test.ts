import { server } from '@/__mocks__/server';
import {
  createLoginErrorHandler,
  createLogoutErrorHandler,
  createAuthStatusHandler,
  createSessionExpiredAuthStatusHandler,
} from '@/__mocks__/handlers';
import { authApi } from '../api/auth-api';

describe('authApi', () => {
  describe('login', () => {
    it('正しい認証情報でログイン成功', async () => {
      const result = await authApi.login({
        email: 'user@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        data: {
          user: {
            id: 1,
            email: 'user@example.com',
          },
        },
        meta: {
          message: 'ログインしました。',
          session_expires_in_days: 30,
        },
      });
    });

    it('不正な認証情報で401エラー', async () => {
      server.use(createLoginErrorHandler(401));

      await expect(
        authApi.login({
          email: 'wrong@example.com',
          password: 'wrong',
        }),
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('ログアウト成功', async () => {
      const result = await authApi.logout();

      expect(result).toEqual({
        data: {
          logged_out: true,
        },
        meta: {
          message: 'ログアウトしました。',
        },
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
        data: {
          authenticated: true,
          user: {
            id: 1,
            email: 'user@example.com',
          },
        },
        meta: {},
      });
    });

    it('未認証ユーザーの場合', async () => {
      server.use(createAuthStatusHandler(false));

      await expect(authApi.getAuthStatus()).resolves.toEqual({
        data: {
          authenticated: false,
          user: null,
        },
        meta: {},
      });
    });

    it('セッション失効時は401エラー', async () => {
      server.use(createSessionExpiredAuthStatusHandler());

      await expect(authApi.getAuthStatus()).rejects.toThrow();
    });
  });
});

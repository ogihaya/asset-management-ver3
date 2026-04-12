import { http, HttpResponse } from 'msw';
import { server } from '@/__mocks__/server';

const API_BASE_URL = 'http://localhost:8000';
const SESSION_EXPIRED_RESPONSE = {
  error: {
    code: 'SESSION_EXPIRED',
    message: 'セッションの有効期限が切れました。再度ログインしてください。',
    details: {},
  },
};

// httpClient は各テストで動的にインポートする必要がある
// （環境変数やwindow.locationの状態をリセットするため）

describe('httpClient', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('基本設定', () => {
    it('baseURLが正しく設定されている', async () => {
      const { default: httpClient } =
        await import('@/shared/api/client/http-client');

      expect(httpClient.defaults.baseURL).toBe(API_BASE_URL);
    });

    it('timeoutが正しく設定されている', async () => {
      const { default: httpClient } =
        await import('@/shared/api/client/http-client');

      expect(httpClient.defaults.timeout).toBe(10000);
    });

    it('withCredentialsが有効になっている', async () => {
      const { default: httpClient } =
        await import('@/shared/api/client/http-client');

      expect(httpClient.defaults.withCredentials).toBe(true);
    });
  });

  describe('レスポンスインターセプター', () => {
    it('401 SESSION_EXPIRED時に登録済みハンドラーを呼ぶ', async () => {
      server.use(
        http.get(`${API_BASE_URL}/protected`, () => {
          return HttpResponse.json(SESSION_EXPIRED_RESPONSE, { status: 401 });
        }),
      );

      const onSessionExpired = jest.fn();
      const { default: httpClient, registerSessionExpiredHandler } =
        await import('@/shared/api/client/http-client');

      registerSessionExpiredHandler(onSessionExpired);

      await expect(httpClient.get('/protected')).rejects.toThrow();

      expect(onSessionExpired).toHaveBeenCalledTimes(1);
    });

    it('/auth/statusの401 SESSION_EXPIREDはハンドラーを呼ばない', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/v1/auth/status`, () => {
          return HttpResponse.json(SESSION_EXPIRED_RESPONSE, { status: 401 });
        }),
      );

      const onSessionExpired = jest.fn();
      const { default: httpClient, registerSessionExpiredHandler } =
        await import('@/shared/api/client/http-client');

      registerSessionExpiredHandler(onSessionExpired);

      await expect(httpClient.get('/api/v1/auth/status')).rejects.toThrow();

      expect(onSessionExpired).not.toHaveBeenCalled();
    });

    it('通常の401エラーではハンドラーを呼ばない', async () => {
      server.use(
        http.get(`${API_BASE_URL}/protected`, () => {
          return HttpResponse.json(
            {
              error: {
                code: 'UNAUTHORIZED',
                message: '認証に失敗しました。',
                details: {},
              },
            },
            { status: 401 },
          );
        }),
      );

      const onSessionExpired = jest.fn();
      const { default: httpClient, registerSessionExpiredHandler } =
        await import('@/shared/api/client/http-client');

      registerSessionExpiredHandler(onSessionExpired);

      await expect(httpClient.get('/protected')).rejects.toThrow();

      expect(onSessionExpired).not.toHaveBeenCalled();
    });

    it('正常なレスポンスはそのまま返される', async () => {
      server.use(
        http.get(`${API_BASE_URL}/test`, () => {
          return HttpResponse.json({ data: 'success' });
        }),
      );

      const { default: httpClient } =
        await import('@/shared/api/client/http-client');

      const response = await httpClient.get('/test');

      expect(response.data).toEqual({ data: 'success' });
    });
  });

  describe('ネットワークエラー', () => {
    it('ネットワークエラー時はPromise.rejectを返す', async () => {
      server.use(
        http.get(`${API_BASE_URL}/network-error`, () => {
          return HttpResponse.error();
        }),
      );

      const { default: httpClient } =
        await import('@/shared/api/client/http-client');

      await expect(httpClient.get('/network-error')).rejects.toThrow();
    });
  });
});

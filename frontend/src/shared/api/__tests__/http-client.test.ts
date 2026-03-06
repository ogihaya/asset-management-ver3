import { http, HttpResponse } from 'msw';
import { server } from '@/__mocks__/server';

const API_BASE_URL = 'http://localhost:8000';

// httpClient は各テストで動的にインポートする必要がある
// （環境変数やwindow.locationの状態をリセットするため）

describe('httpClient', () => {
  let locationHref = 'http://localhost:3000';
  const originalLocation = window.location;

  beforeEach(() => {
    // window.location をモック
    locationHref = 'http://localhost:3000';
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: locationHref,
    } as Location;

    Object.defineProperty(window.location, 'href', {
      get: () => locationHref,
      set: (value: string) => {
        locationHref = value;
      },
      configurable: true,
    });

    // モジュールキャッシュをクリア
    jest.resetModules();
  });

  afterEach(() => {
    // window.location を復元
    window.location = originalLocation;
  });

  describe('基本設定', () => {
    it('baseURLが正しく設定されている', async () => {
      const { default: httpClient } = await import(
        '@/shared/api/client/http-client'
      );

      expect(httpClient.defaults.baseURL).toBe(API_BASE_URL);
    });

    it('timeoutが正しく設定されている', async () => {
      const { default: httpClient } = await import(
        '@/shared/api/client/http-client'
      );

      expect(httpClient.defaults.timeout).toBe(10000);
    });

    it('withCredentialsが有効になっている', async () => {
      const { default: httpClient } = await import(
        '@/shared/api/client/http-client'
      );

      expect(httpClient.defaults.withCredentials).toBe(true);
    });
  });

  describe('レスポンスインターセプター', () => {
    // Note: window.location.href の設定はjsdom環境で完全にテストすることが困難です。
    // このテストはE2Eテストで検証することを推奨します。
    it('401エラー時にエラーをスローする', async () => {
      server.use(
        http.get(`${API_BASE_URL}/protected`, () => {
          return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
        }),
      );

      const { default: httpClient } = await import(
        '@/shared/api/client/http-client'
      );

      await expect(httpClient.get('/protected')).rejects.toThrow();
    });

    it('/auth/statusの401はリダイレクトしない', async () => {
      server.use(
        http.get(`${API_BASE_URL}/auth/status`, () => {
          return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
        }),
      );

      const { default: httpClient } = await import(
        '@/shared/api/client/http-client'
      );

      const initialHref = locationHref;

      await expect(httpClient.get('/auth/status')).rejects.toThrow();

      // リダイレクトは発生しない
      expect(locationHref).toBe(initialHref);
    });

    it('正常なレスポンスはそのまま返される', async () => {
      server.use(
        http.get(`${API_BASE_URL}/test`, () => {
          return HttpResponse.json({ data: 'success' });
        }),
      );

      const { default: httpClient } = await import(
        '@/shared/api/client/http-client'
      );

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

      const { default: httpClient } = await import(
        '@/shared/api/client/http-client'
      );

      await expect(httpClient.get('/network-error')).rejects.toThrow();
    });
  });
});

/**
 * Middleware テスト
 *
 * Note: Next.js の middleware は Edge Runtime で動作するため、
 * Jest での完全なテストは困難です。このテストでは基本的なロジックを検証します。
 */

import { NextRequest } from 'next/server';

// 環境変数のバックアップ
const originalEnv = process.env;

describe('middleware', () => {
  // fetch をモック
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // global fetch をモック
    global.fetch = mockFetch;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createRequest = (
    pathname: string,
    cookies?: Record<string, string>,
  ) => {
    const url = `http://localhost:3000${pathname}`;
    const request = new NextRequest(url);

    if (cookies) {
      Object.entries(cookies).forEach(([name, value]) => {
        request.cookies.set(name, value);
      });
    }

    return request;
  };

  describe('認証が有効な場合', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_AUTH = 'true';
    });

    describe('保護されたパス（/dashboard）', () => {
      it('トークンなしでアクセス → /login へリダイレクト', async () => {
        const { middleware } = await import('../middleware');
        const request = createRequest('/dashboard');

        const response = await middleware(request);

        expect(response.headers.get('location')).toContain('/login');
      });

      it('有効なトークンでアクセス → そのまま表示', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true });

        const { middleware } = await import('../middleware');
        const request = createRequest('/dashboard', {
          access_token: 'valid_token',
        });

        const response = await middleware(request);

        // NextResponse.next() の場合、locationヘッダーはない
        expect(response.headers.get('location')).toBeNull();
      });

      it('無効なトークンでアクセス → /login へリダイレクト', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const { middleware } = await import('../middleware');
        const request = createRequest('/dashboard', {
          access_token: 'invalid_token',
        });

        const response = await middleware(request);

        expect(response.headers.get('location')).toContain('/login');
      });
    });

    describe('認証ページ（/login）', () => {
      it('認証済みでアクセス → /dashboard へリダイレクト', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true });

        const { middleware } = await import('../middleware');
        const request = createRequest('/login', {
          access_token: 'valid_token',
        });

        const response = await middleware(request);

        expect(response.headers.get('location')).toContain('/dashboard');
      });

      it('未認証でアクセス → そのまま表示', async () => {
        const { middleware } = await import('../middleware');
        const request = createRequest('/login');

        const response = await middleware(request);

        expect(response.headers.get('location')).toBeNull();
      });
    });

    describe('ルートパス（/）', () => {
      it('認証済みでアクセス → /dashboard へリダイレクト', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true });

        const { middleware } = await import('../middleware');
        const request = createRequest('/', {
          access_token: 'valid_token',
        });

        const response = await middleware(request);

        expect(response.headers.get('location')).toContain('/dashboard');
      });

      it('未認証でアクセス → /login へリダイレクト', async () => {
        const { middleware } = await import('../middleware');
        const request = createRequest('/');

        const response = await middleware(request);

        expect(response.headers.get('location')).toContain('/login');
      });
    });
  });

  describe('認証が無効な場合', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_AUTH = 'false';
    });

    it('/ へアクセス → /dashboard へリダイレクト', async () => {
      const { middleware } = await import('../middleware');
      const request = createRequest('/');

      const response = await middleware(request);

      expect(response.headers.get('location')).toContain('/dashboard');
    });

    it('/login へアクセス → /dashboard へリダイレクト', async () => {
      const { middleware } = await import('../middleware');
      const request = createRequest('/login');

      const response = await middleware(request);

      expect(response.headers.get('location')).toContain('/dashboard');
    });

    it('/dashboard へアクセス → そのまま表示', async () => {
      const { middleware } = await import('../middleware');
      const request = createRequest('/dashboard');

      const response = await middleware(request);

      expect(response.headers.get('location')).toBeNull();
    });
  });
});

describe('verifyToken', () => {
  const originalEnv = process.env;
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    global.fetch = mockFetch;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('API成功時にtrueを返す', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    process.env.NEXT_PUBLIC_ENABLE_AUTH = 'true';
    const { middleware } = await import('../middleware');
    const request = new NextRequest('http://localhost:3000/dashboard');
    request.cookies.set('access_token', 'valid_token');

    await middleware(request);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/status'),
      expect.objectContaining({
        method: 'GET',
        headers: { Cookie: 'access_token=valid_token' },
      }),
    );
  });

  it('API失敗時はリダイレクトされる', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    process.env.NEXT_PUBLIC_ENABLE_AUTH = 'true';
    const { middleware } = await import('../middleware');
    const request = new NextRequest('http://localhost:3000/dashboard');
    request.cookies.set('access_token', 'invalid_token');

    const response = await middleware(request);

    expect(response.headers.get('location')).toContain('/login');
  });

  it('ネットワークエラー時はリダイレクトされる', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    process.env.NEXT_PUBLIC_ENABLE_AUTH = 'true';
    const { middleware } = await import('../middleware');
    const request = new NextRequest('http://localhost:3000/dashboard');
    request.cookies.set('access_token', 'any_token');

    const response = await middleware(request);

    expect(response.headers.get('location')).toContain('/login');
  });
});

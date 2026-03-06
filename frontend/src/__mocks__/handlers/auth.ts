import { http, HttpResponse } from 'msw';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * 認証API のデフォルトハンドラー（成功レスポンス）
 */
export const authHandlers = [
  // ログイン成功
  http.post(`${API_BASE_URL}/auth/login`, () => {
    return HttpResponse.json({
      message: 'ログイン成功',
      access_token: 'test_token',
      user_id: 1,
    });
  }),

  // ログアウト成功
  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({ message: 'ログアウトしました' });
  }),

  // 認証状態（認証済み）
  http.get(`${API_BASE_URL}/auth/status`, () => {
    return HttpResponse.json({
      is_authenticated: true,
      user_id: 1,
    });
  }),
];

/**
 * エラーレスポンス用のハンドラー生成関数
 */
export const createLoginErrorHandler = (status: number = 401) =>
  http.post(`${API_BASE_URL}/auth/login`, () => {
    return HttpResponse.json({ detail: 'Invalid credentials' }, { status });
  });

export const createLogoutErrorHandler = (status: number = 500) =>
  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({ detail: 'Logout failed' }, { status });
  });

export const createAuthStatusHandler = (isAuthenticated: boolean) =>
  http.get(`${API_BASE_URL}/auth/status`, () => {
    if (isAuthenticated) {
      return HttpResponse.json({
        is_authenticated: true,
        user_id: 1,
      });
    }
    return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  });

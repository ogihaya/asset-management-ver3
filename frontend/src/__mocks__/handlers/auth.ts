import { http, HttpResponse } from 'msw';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const AUTH_API_BASE_URL = `${API_BASE_URL}/api/v1/auth`;
const TEST_USER = {
  id: 1,
  email: 'user@example.com',
};

/**
 * 認証API のデフォルトハンドラー（成功レスポンス）
 */
export const authHandlers = [
  // ログイン成功
  http.post(`${AUTH_API_BASE_URL}/login`, () => {
    return HttpResponse.json({
      data: {
        user: TEST_USER,
      },
      meta: {
        message: 'ログインしました。',
        session_expires_in_days: 30,
      },
    });
  }),

  // ログアウト成功
  http.post(`${AUTH_API_BASE_URL}/logout`, () => {
    return HttpResponse.json({
      data: {
        logged_out: true,
      },
      meta: {
        message: 'ログアウトしました。',
      },
    });
  }),

  // 認証状態（認証済み）
  http.get(`${AUTH_API_BASE_URL}/status`, () => {
    return HttpResponse.json({
      data: {
        authenticated: true,
        user: TEST_USER,
      },
      meta: {},
    });
  }),
];

/**
 * エラーレスポンス用のハンドラー生成関数
 */
export const createLoginErrorHandler = (status: number = 401) =>
  http.post(`${AUTH_API_BASE_URL}/login`, () => {
    return HttpResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: '認証に失敗しました。',
          details: {},
        },
      },
      { status },
    );
  });

export const createLogoutErrorHandler = (status: number = 500) =>
  http.post(`${AUTH_API_BASE_URL}/logout`, () => {
    return HttpResponse.json(
      {
        error: {
          code: 'SERVER_ERROR',
          message: 'ログアウトに失敗しました。',
          details: {},
        },
      },
      { status },
    );
  });

export const createAuthStatusHandler = (isAuthenticated: boolean) =>
  http.get(`${AUTH_API_BASE_URL}/status`, () => {
    if (isAuthenticated) {
      return HttpResponse.json({
        data: {
          authenticated: true,
          user: TEST_USER,
        },
        meta: {},
      });
    }
    return HttpResponse.json({
      data: {
        authenticated: false,
        user: null,
      },
      meta: {},
    });
  });

export const createSessionExpiredAuthStatusHandler = () =>
  http.get(`${AUTH_API_BASE_URL}/status`, () => {
    return HttpResponse.json(
      {
        error: {
          code: 'SESSION_EXPIRED',
          message:
            'セッションの有効期限が切れました。再度ログインしてください。',
          details: {},
        },
      },
      { status: 401 },
    );
  });

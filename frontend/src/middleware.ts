import { NextRequest, NextResponse } from 'next/server';

// バックエンドAPIのベースURL（Middlewareはサーバーサイドで実行されるため、Docker内部のURLを使用）
const API_BASE_URL =
  process.env.SERVER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

// 認証機能の有効/無効
const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH !== 'false';
const SESSION_COOKIE_NAME = 'asset_management_session';
const AUTH_STATUS_PATH = '/api/v1/auth/status';

// 認証が必要なパス
const PROTECTED_PATHS = [
  '/dashboard',
  '/monthly-record',
  '/life-plan',
  '/settings',
];

// 認証済みユーザーがアクセスできないパス
const AUTH_PATHS = [
  '/login',
  '/signup',
  '/password-reset/request',
  '/password-reset/reset',
];

type AuthStatus = 'authenticated' | 'unauthenticated' | 'expired' | 'error';

/**
 * Middleware: サーバーサイドで認証状態をチェック
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 認証が無効の場合
  if (!ENABLE_AUTH) {
    // ルートパスへのアクセスはダッシュボードへリダイレクト
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // 公開認証ページへのアクセスはダッシュボードへリダイレクト
    if (AUTH_PATHS.some((path) => pathname.startsWith(path))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // その他のパスはそのまま続行
    return NextResponse.next();
  }

  // 保護されたパスかどうかをチェック
  const isProtectedPath = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path),
  );
  const isAuthPath = AUTH_PATHS.some((path) => pathname.startsWith(path));

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // ルートパスへのアクセス
  if (pathname === '/') {
    if (!sessionToken) {
      return redirectTo(request, '/login');
    }

    const authStatus = await verifySession(sessionToken);
    return redirectTo(
      request,
      authStatus === 'authenticated' ? '/dashboard' : '/login',
    );
  }

  // 保護されたパスにアクセスしようとしている場合
  if (isProtectedPath) {
    if (!sessionToken) {
      return redirectTo(request, '/login');
    }

    const authStatus = await verifySession(sessionToken);
    if (authStatus !== 'authenticated') {
      return redirectTo(request, '/login');
    }

    return NextResponse.next();
  }

  if (isAuthPath) {
    if (!sessionToken) {
      return NextResponse.next();
    }

    const authStatus = await verifySession(sessionToken);
    if (authStatus === 'authenticated') {
      return redirectTo(request, '/dashboard');
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

/**
 * バックエンドAPIでセッション状態を検証
 */
async function verifySession(token: string): Promise<AuthStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}${AUTH_STATUS_PATH}`, {
      method: 'GET',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      cache: 'no-store',
    });

    if (response.status === 401) {
      const body = await response.json().catch(() => null);
      return body?.error?.code === 'SESSION_EXPIRED'
        ? 'expired'
        : 'unauthenticated';
    }

    if (!response.ok) {
      return 'unauthenticated';
    }

    const body = await response.json().catch(() => null);
    return body?.data?.authenticated === true
      ? 'authenticated'
      : 'unauthenticated';
  } catch (error) {
    console.error('Token verification error:', error);
    return 'error';
  }
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

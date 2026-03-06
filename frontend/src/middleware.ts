import { NextRequest, NextResponse } from 'next/server';

// バックエンドAPIのベースURL（Middlewareはサーバーサイドで実行されるため、Docker内部のURLを使用）
const API_BASE_URL =
  process.env.SERVER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

// 認証機能の有効/無効
const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH !== 'false';

// 認証が必要なパス
const PROTECTED_PATHS = ['/dashboard'];

// 認証済みユーザーがアクセスできないパス
const AUTH_PATHS = ['/login'];

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
    // ログインページへのアクセスはダッシュボードへリダイレクト
    if (pathname === '/login') {
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

  // Cookieからaccess_tokenを取得
  const accessToken = request.cookies.get('access_token')?.value;

  // ルートパスへのアクセス
  if (pathname === '/') {
    if (accessToken) {
      // トークンがある場合、バックエンドで検証してからリダイレクト
      const isAuthenticated = await verifyToken(accessToken);
      const url = request.nextUrl.clone();
      url.pathname = isAuthenticated ? '/dashboard' : '/login';
      return NextResponse.redirect(url);
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 保護されたパスにアクセスしようとしている場合
  if (isProtectedPath) {
    if (!accessToken) {
      // トークンがない場合はログインページへリダイレクト
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // トークンがある場合、バックエンドで検証
    const isAuthenticated = await verifyToken(accessToken);
    if (!isAuthenticated) {
      // 認証失敗: ログインページへリダイレクト
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // 認証成功: そのまま続行
    return NextResponse.next();
  }

  // ログインページにアクセスしようとしている場合
  if (isAuthPath && accessToken) {
    // トークンがある場合、バックエンドで検証
    const isAuthenticated = await verifyToken(accessToken);
    if (isAuthenticated) {
      // 認証済みの場合はダッシュボードへリダイレクト
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // その他のパスはそのまま続行
  return NextResponse.next();
}

/**
 * バックエンドAPIでトークンを検証
 */
async function verifyToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/status`, {
      method: 'GET',
      headers: {
        Cookie: `access_token=${token}`,
      },
      cache: 'no-store',
    });

    return response.ok;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
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

// ログインリクエスト
export interface LoginRequest {
  login_id: string;
  password: string;
}

// ログインレスポンス (バックエンド: POST /auth/login)
export interface LoginResponse {
  message: string;
  access_token: string;
  user_id: number;
}

// ログアウトレスポンス (バックエンド: POST /auth/logout)
export interface LogoutResponse {
  message: string;
}

// 認証状態レスポンス (バックエンド: GET /auth/status)
export interface StatusResponse {
  is_authenticated: boolean;
  user_id: number;
}

// ユーザー型
export interface User {
  id: number;
  email?: string;
  name?: string;
}

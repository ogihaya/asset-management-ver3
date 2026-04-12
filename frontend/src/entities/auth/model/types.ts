export interface User {
  id: number;
  email: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    user: User;
  };
  meta: {
    message: string;
    session_expires_in_days: number;
  };
}

export interface LogoutResponse {
  data: {
    logged_out: boolean;
  };
  meta: {
    message: string;
  };
}

export interface StatusResponse {
  data: {
    authenticated: boolean;
    user: User | null;
  };
  meta: Record<string, never>;
}

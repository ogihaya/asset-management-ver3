import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 認証機能の有効/無効
const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH !== 'false';
const AUTH_STATUS_PATH = '/api/v1/auth/status';

interface ApiErrorResponse {
  error?: {
    code?: string;
  };
}

type SessionExpiredHandler = (() => void | Promise<void>) | null;

let sessionExpiredHandler: SessionExpiredHandler = null;

export function registerSessionExpiredHandler(handler: SessionExpiredHandler) {
  sessionExpiredHandler = handler;
}

export function isSessionExpiredError(error: unknown): boolean {
  return (
    axios.isAxiosError<ApiErrorResponse>(error) &&
    error.response?.status === 401 &&
    error.response?.data?.error?.code === 'SESSION_EXPIRED'
  );
}

// Axiosインスタンス作成
const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Cookieを送信
});

// リクエストインターセプター
httpClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// レスポンスインターセプター
httpClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', response.status, response.config.url);
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);

      if (ENABLE_AUTH && isSessionExpiredError(error)) {
        const isAuthStatusRequest =
          error.config?.url?.includes(AUTH_STATUS_PATH) ?? false;

        if (!isAuthStatusRequest && sessionExpiredHandler) {
          void Promise.resolve(sessionExpiredHandler()).catch(
            (handlerError: unknown) => {
              console.error('Session expired handler failed:', handlerError);
            },
          );
        }
      }
    } else if (error.request) {
      console.error('Network Error:', error.message);
    } else {
      console.error('Request Setup Error:', error.message);
    }

    return Promise.reject(error);
  },
);

export default httpClient;

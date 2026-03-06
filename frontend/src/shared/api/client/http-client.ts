import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 認証機能の有効/無効
const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH !== 'false';

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

      // 401エラー: 認証エラー時はログインページへリダイレクト（認証が有効な場合のみ）
      if (error.response.status === 401 && ENABLE_AUTH) {
        console.warn('Unauthorized. Redirecting to login...');

        // /auth/status以外のエンドポイントで401エラーが発生した場合のみリダイレクト
        const isAuthStatusRequest = error.config?.url?.includes('/auth/status');
        if (!isAuthStatusRequest && typeof window !== 'undefined') {
          window.location.href = '/login';
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

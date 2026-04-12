'use client';

import { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store, AppDispatch } from '@/store/index';
import { QueryProvider } from '@/app/provider/QueryProvider';
import { setUser, clearUser, setLoading } from '@/store/slices/authSlice';
import { authApi } from '@/entities/auth/api/auth-api';
import {
  isSessionExpiredError,
  registerSessionExpiredHandler,
} from '@/shared/api';

// 認証機能の有効/無効
const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH !== 'false';

/**
 * 認証状態を復元するコンポーネント
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    registerSessionExpiredHandler(() => {
      dispatch(clearUser());
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    });

    return () => {
      registerSessionExpiredHandler(null);
    };
  }, [dispatch]);

  useEffect(() => {
    // 認証が無効の場合はダミーユーザーを設定
    if (!ENABLE_AUTH) {
      dispatch(
        setUser({
          id: 0,
          email: 'local-user@example.com',
          name: 'Local User',
        }),
      );
      return;
    }

    const initializeAuth = async () => {
      dispatch(setLoading(true));

      try {
        const response = await authApi.getAuthStatus();
        if (response.data.authenticated && response.data.user) {
          dispatch(setUser(response.data.user));
        } else {
          dispatch(clearUser());
        }
      } catch (error) {
        if (isSessionExpiredError(error)) {
          dispatch(clearUser());
          return;
        }

        dispatch(clearUser());
      }
    };

    void initializeAuth();
  }, [dispatch]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <QueryProvider>
        <AuthInitializer>{children}</AuthInitializer>
      </QueryProvider>
    </Provider>
  );
}

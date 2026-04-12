import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/__mocks__/server';
import { createLoginErrorHandler } from '@/__mocks__/handlers';
import { TestProviders } from '@/__tests__/testing-utils';
import { useLogin } from '../lib/use-login';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

describe('useLogin', () => {
  it('ログイン成功時にonSuccessコールバックが呼ばれる', async () => {
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useLogin({ onSuccess }), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    result.current.mutate({ email: 'user@example.com', password: 'password' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(
      {
        data: {
          user: {
            id: 1,
            email: 'user@example.com',
          },
        },
        meta: {
          message: 'ログインしました。',
          session_expires_in_days: 30,
        },
      },
      { email: 'user@example.com', password: 'password' },
      undefined,
      expect.objectContaining({ client: expect.anything() }),
    );
  });

  it('ログイン失敗時にonErrorコールバックが呼ばれる', async () => {
    server.use(createLoginErrorHandler(401));
    const onError = jest.fn();

    const { result } = renderHook(() => useLogin({ onError }), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    result.current.mutate({ email: 'wrong@example.com', password: 'wrong' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalled();
  });

  it('ローディング状態がisPendingで確認できる', async () => {
    const { result } = renderHook(() => useLogin(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.isPending).toBe(false);

    result.current.mutate({ email: 'user@example.com', password: 'password' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('email/passwordを正式login APIへそのまま送る', async () => {
    let receivedBody: unknown = null;

    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({
          data: {
            user: {
              id: 1,
              email: 'user@example.com',
            },
          },
          meta: {
            message: 'ログインしました。',
            session_expires_in_days: 30,
          },
        });
      }),
    );

    const { result } = renderHook(() => useLogin(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    result.current.mutate({ email: 'user@example.com', password: 'password' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(receivedBody).toEqual({
      email: 'user@example.com',
      password: 'password',
    });

    expect(result.current.data).toEqual({
      data: {
        user: {
          id: 1,
          email: 'user@example.com',
        },
      },
      meta: {
        message: 'ログインしました。',
        session_expires_in_days: 30,
      },
    });
  });
});

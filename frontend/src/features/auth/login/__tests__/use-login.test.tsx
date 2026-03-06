import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/__mocks__/server';
import { createLoginErrorHandler } from '@/__mocks__/handlers';
import { TestProviders } from '@/__tests__/testing-utils';
import { useLogin } from '../lib/use-login';

describe('useLogin', () => {
  it('ログイン成功時にonSuccessコールバックが呼ばれる', async () => {
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useLogin({ onSuccess }), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    result.current.mutate({ loginId: 'admin', password: 'password' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(
      { message: 'ログイン成功', access_token: 'test_token', user_id: 1 },
      { loginId: 'admin', password: 'password' },
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

    result.current.mutate({ loginId: 'wrong', password: 'wrong' });

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

    result.current.mutate({ loginId: 'admin', password: 'password' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('loginId/passwordからlogin_id/passwordへの変換を行う', async () => {
    const { result } = renderHook(() => useLogin(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    result.current.mutate({ loginId: 'admin', password: 'password' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      message: 'ログイン成功',
      access_token: 'test_token',
      user_id: 1,
    });
  });
});

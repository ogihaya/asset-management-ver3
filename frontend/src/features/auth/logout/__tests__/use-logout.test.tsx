import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/__mocks__/server';
import { createLogoutErrorHandler } from '@/__mocks__/handlers';
import { TestProviders } from '@/__tests__/testing-utils';
import { useLogout } from '../lib/use-logout';

describe('useLogout', () => {
  it('ログアウト成功時にonSuccessコールバックが呼ばれる', async () => {
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useLogout({ onSuccess }), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(
      {
        data: {
          logged_out: true,
        },
        meta: {
          message: 'ログアウトしました。',
        },
      },
      undefined,
      undefined,
      expect.objectContaining({ client: expect.anything() }),
    );
  });

  it('ログアウト失敗時にonErrorコールバックが呼ばれる', async () => {
    server.use(createLogoutErrorHandler(500));
    const onError = jest.fn();

    const { result } = renderHook(() => useLogout({ onError }), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalled();
  });
});

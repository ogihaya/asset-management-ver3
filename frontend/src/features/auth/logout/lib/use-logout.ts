import { useMutation } from '@tanstack/react-query';
import { authApi, type LogoutResponse } from '@/entities/auth';

export interface UseLogoutOptions {
  onSuccess?: (data: LogoutResponse) => void;
  onError?: (error: Error) => void;
}

export function useLogout(options: UseLogoutOptions = {}) {
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

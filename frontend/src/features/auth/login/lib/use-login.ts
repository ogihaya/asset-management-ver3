import { useMutation } from '@tanstack/react-query';
import { authApi, type LoginResponse } from '@/entities/auth';
import type { LoginFormData } from '../model/types';

export interface UseLoginOptions {
  onSuccess?: (data: LoginResponse) => void;
  onError?: (error: Error) => void;
}

export function useLogin(options: UseLoginOptions = {}) {
  return useMutation({
    mutationFn: (credentials: LoginFormData) => {
      return authApi.login({
        login_id: credentials.loginId,
        password: credentials.password,
      });
    },
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

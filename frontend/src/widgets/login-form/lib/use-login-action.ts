'use client';

import { useRouter } from 'next/navigation';
import { useLogin, type LoginFormData } from '@/features/auth/login';
import { useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';

export function useLoginAction() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  return useLogin({
    onSuccess: (data) => {
      dispatch(setUser({ id: data.user_id }));
      router.push('/dashboard');
    },
    onError: (error) => {
      console.error('Login failed:', error);
    },
  });
}

export type { LoginFormData };

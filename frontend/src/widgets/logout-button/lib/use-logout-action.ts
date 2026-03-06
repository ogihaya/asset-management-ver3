'use client';

import { useRouter } from 'next/navigation';
import { useLogout } from '@/features/auth/logout';
import { useAppDispatch } from '@/store/hooks';
import { clearUser } from '@/store/slices/authSlice';

export function useLogoutAction() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  return useLogout({
    onSuccess: () => {
      dispatch(clearUser());
      router.push('/login');
    },
    onError: (error) => {
      console.error('Logout failed:', error);
    },
  });
}

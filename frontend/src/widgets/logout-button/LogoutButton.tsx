'use client';

import { Button } from '@/shared/ui/shadcn/ui/button';
import { useLogoutAction } from './lib/use-logout-action';

interface LogoutButtonProps {
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function LogoutButton({
  variant = 'destructive',
  size = 'default',
  className,
}: LogoutButtonProps) {
  const logoutMutation = useLogoutAction();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={logoutMutation.isPending}
      variant={variant}
      size={size}
      className={className}
    >
      {logoutMutation.isPending ? 'ログアウト中...' : 'ログアウト'}
    </Button>
  );
}

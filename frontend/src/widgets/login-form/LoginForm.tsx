'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/shadcn/ui/button';
import { Input } from '@/shared/ui/shadcn/ui/input';
import { Label } from '@/shared/ui/shadcn/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/ui/card';
import { useLoginAction, type LoginFormData } from './lib/use-login-action';

export function LoginForm() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLoginAction();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const credentials: LoginFormData = { loginId, password };
    loginMutation.mutate(credentials);
  };

  return (
    <Card className='w-full max-w-md'>
      <CardHeader className='space-y-1'>
        <CardTitle className='text-2xl font-bold'>ログイン</CardTitle>
        <CardDescription>アカウントにログインしてください</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='loginId'>ログインID</Label>
            <Input
              id='loginId'
              type='text'
              placeholder='ログインIDを入力'
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='password'>パスワード</Label>
            <Input
              id='password'
              type='password'
              placeholder='••••••••'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {loginMutation.isError && (
            <div className='rounded-md bg-destructive/15 p-3 text-sm text-destructive'>
              ログインに失敗しました。ログインIDとパスワードを確認してください。
            </div>
          )}

          <Button
            type='submit'
            className='w-full'
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../app/store';
import { AuthScreen, type AuthBannerState } from '../components/auth';
import { Button, Field, TextInput } from '../components/ui';

export function LoginPage() {
  const { login } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('Demo1234!');
  const locationBanner = (location.state as { banner?: AuthBannerState } | null)?.banner ?? null;
  const [banner, setBanner] = useState<AuthBannerState | null>(locationBanner);

  useEffect(
    function () {
      if (locationBanner) {
        setBanner(locationBanner);
      }
    },
    [locationBanner],
  );

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = login(email, password);
    if (ok) {
      navigate('/dashboard');
      return;
    }

    setBanner({
      tone: 'warning',
      title: 'ログインに失敗しました。',
      description: 'デモアカウントは demo@example.com / Demo1234! です。',
    });
  }

  return (
    <AuthScreen
      title='ログイン'
      description='メールアドレスとパスワードでログインします。失敗時や完了通知は画面上部のバナーで確認できます。'
      banner={banner}
      footer={
        <div className='flex flex-wrap justify-end gap-3'>
          <Button type='button' variant='ghost' onClick={() => navigate('/signup')}>
            新規登録
          </Button>
          <Button type='button' variant='ghost' onClick={() => navigate('/password-reset/request')}>
            パスワード再設定
          </Button>
        </div>
      }
    >
      <form className='space-y-5' onSubmit={handleLogin}>
        <Field label='メールアドレス'>
          <TextInput value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label='パスワード'>
          <TextInput type='password' value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <div className='rounded-[24px] bg-cloud/70 p-4 text-sm leading-7 text-ink/65'>
          デモ認証情報は `demo@example.com / Demo1234!` です。別値を入れると失敗時バナーを確認できます。
        </div>
        <Button className='w-full' type='submit'>
          ログイン
        </Button>
      </form>
    </AuthScreen>
  );
}

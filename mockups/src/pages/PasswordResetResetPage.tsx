import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthScreen, type AuthBannerState } from '../components/auth';
import { Button, Field, TextInput } from '../components/ui';

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function PasswordResetResetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const validToken = params.get('token') === 'demo';
  const locationBanner = (location.state as { banner?: AuthBannerState } | null)?.banner ?? null;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [banner, setBanner] = useState<AuthBannerState | null>(locationBanner);

  useEffect(
    function () {
      if (locationBanner) {
        setBanner(locationBanner);
      } else if (!validToken) {
        setBanner({
          tone: 'warning',
          title: '再設定リンクが無効か期限切れです。',
          description: '再度メール送信画面から再設定フローを開始してください。',
        });
      }
    },
    [locationBanner, validToken],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validToken) {
      setBanner({
        tone: 'warning',
        title: '再設定リンクが無効か期限切れです。',
        description: '再度メール送信画面からやり直してください。',
      });
      return;
    }

    if (!isStrongPassword(password)) {
      setBanner({ tone: 'warning', title: 'パスワード要件を満たしていません。', description: '8文字以上で、英字と数字の両方を含めてください。' });
      return;
    }

    if (password !== confirmPassword) {
      setBanner({ tone: 'warning', title: '確認用パスワードが一致していません。' });
      return;
    }

    navigate('/login', {
      state: {
        banner: {
          tone: 'success',
          title: 'パスワードを再設定しました。',
          description: '新しいパスワードでログインしてください。',
        },
      },
    });
  }

  return (
    <AuthScreen
      title='新しいパスワード設定'
      description='メール内リンクから、新しいパスワードを設定します。完了後はログイン画面へ戻ります。'
      banner={banner}
      footer={
        <div className='flex flex-wrap justify-end gap-3'>
          <Button type='button' variant='ghost' onClick={() => navigate('/login')}>
            ログインへ戻る
          </Button>
          <Button type='button' variant='ghost' onClick={() => navigate('/password-reset/request')}>
            再設定メール送信へ戻る
          </Button>
        </div>
      }
    >
      {validToken ? (
        <form className='space-y-5' onSubmit={handleSubmit}>
          <Field label='新しいパスワード' hint='8文字以上、英字と数字を含む'>
            <TextInput type='password' value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Field label='確認用パスワード'>
            <TextInput type='password' value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </Field>
          <Button className='w-full' type='submit'>
            パスワードを再設定
          </Button>
        </form>
      ) : null}
    </AuthScreen>
  );
}

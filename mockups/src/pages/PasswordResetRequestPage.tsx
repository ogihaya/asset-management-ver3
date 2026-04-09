import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthScreen, type AuthBannerState } from '../components/auth';
import { Button, Field, TextInput } from '../components/ui';

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export function PasswordResetRequestPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [banner, setBanner] = useState<AuthBannerState | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setBanner({ tone: 'warning', title: 'メールアドレスの形式が正しくありません。' });
      return;
    }

    if (email !== 'demo@example.com') {
      setBanner({ tone: 'warning', title: 'このメールアドレスは登録されていません。' });
      return;
    }

    setSent(true);
    setBanner({
      tone: 'success',
      title: '再設定メールを送信しました。',
      description: 'このモックアップでは、次の画面へ進んで新しいパスワードを設定できます。',
    });
  }

  return (
    <AuthScreen
      title='再設定メール送信'
      description='登録済みメールアドレスを入力すると、パスワード再設定フローを開始します。'
      banner={banner}
      footer={
        <div className='flex flex-wrap justify-end gap-3'>
          <Button type='button' variant='ghost' onClick={() => navigate('/login')}>
            ログインへ戻る
          </Button>
          {sent ? (
            <Button type='button' onClick={() => navigate('/password-reset/reset?token=demo')}>
              新しいパスワード設定へ進む
            </Button>
          ) : null}
        </div>
      }
    >
      <form className='space-y-5' onSubmit={handleSubmit}>
        <Field label='メールアドレス'>
          <TextInput value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Button className='w-full' type='submit'>
          再設定メールを送信
        </Button>
      </form>
    </AuthScreen>
  );
}

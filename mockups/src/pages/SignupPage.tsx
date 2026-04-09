import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthScreen, type AuthBannerState } from '../components/auth';
import { Button, Field, TextInput } from '../components/ui';

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [banner, setBanner] = useState<AuthBannerState | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setBanner({ tone: 'warning', title: 'メールアドレスの形式が正しくありません。' });
      return;
    }

    if (!isStrongPassword(password)) {
      setBanner({ tone: 'warning', title: 'パスワード要件を満たしていません。', description: '8文字以上で、英字と数字の両方を含めてください。' });
      return;
    }

    if (email === 'demo@example.com') {
      setBanner({ tone: 'warning', title: 'このメールアドレスは既に登録されています。' });
      return;
    }

    navigate('/login', {
      state: {
        banner: {
          tone: 'success',
          title: '新規登録が完了しました。',
          description: 'ログイン画面からサインインしてください。',
        },
      },
    });
  }

  return (
    <AuthScreen
      title='新規登録'
      description='メールアドレスとパスワードを入力してアカウントを作成します。登録後はログイン画面へ戻ります。'
      banner={banner}
      footer={
        <div className='flex justify-end'>
          <Button type='button' variant='ghost' onClick={() => navigate('/login')}>
            ログインへ戻る
          </Button>
        </div>
      }
    >
      <form className='space-y-5' onSubmit={handleSubmit}>
        <Field label='メールアドレス'>
          <TextInput value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label='パスワード' hint='8文字以上、英字と数字を含む'>
          <TextInput type='password' value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <Button className='w-full' type='submit'>
          登録する
        </Button>
      </form>
    </AuthScreen>
  );
}

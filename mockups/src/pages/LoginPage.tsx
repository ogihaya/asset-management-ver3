import { ArrowRight, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../app/store';
import { Button, Card, Field, Modal, TextInput } from '../components/ui';

export function LoginPage() {
  const { login } = useAppStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('Demo1234!');
  const [infoOpen, setInfoOpen] = useState<null | 'register' | 'reset'>(null);

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = login(email, password);
    if (ok) {
      navigate('/dashboard');
    }
  }

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(47,125,92,0.18),_transparent_30%),linear-gradient(180deg,#f7f5ef_0%,#fbfaf7_100%)] px-4 py-6'>
      <div className='mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]'>
        <section className='rounded-[36px] border border-white/60 bg-white/70 p-8 shadow-panel backdrop-blur lg:p-10'>
          <div className='inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white'>
            <Sparkles size={16} />
            AssetWise Mockups
          </div>
          <h1 className='mt-8 max-w-2xl text-4xl font-semibold leading-tight text-ink lg:text-5xl'>
            月次の記録から、
            <br />
            将来の投資判断まで一気通貫で確認する。
          </h1>
          <p className='mt-6 max-w-xl text-base leading-8 text-ink/65'>
            このモックアップでは、資産入力、支出補正、投資配分、ライフプラン管理、モバイル導線までをブラウザ上で疑似体験できます。
          </p>
          <div className='mt-10 grid gap-4 sm:grid-cols-3'>
            {[
              ['月次記録', '資産・収入・投資をカード単位で入力'],
              ['支出補正', '確定前に自動推定値を確認して補正'],
              ['設定反映', '投資先配分は次の未確定月から適用'],
            ].map((item) => (
              <Card key={item[0]} className='rounded-[24px] bg-soft'>
                <div className='text-sm font-semibold text-ink'>{item[0]}</div>
                <div className='mt-2 text-sm leading-6 text-ink/55'>{item[1]}</div>
              </Card>
            ))}
          </div>
        </section>

        <Card title='デモログイン' description='メール + パスワード認証のモックです。ログイン後は主要5画面を行き来できます。'>
          <form className='space-y-5' onSubmit={handleLogin}>
            <Field label='メールアドレス'>
              <div className='relative'>
                <Mail className='absolute left-4 top-1/2 -translate-y-1/2 text-ink/35' size={18} />
                <TextInput className='pl-11' value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </Field>
            <Field label='パスワード'>
              <div className='relative'>
                <LockKeyhole className='absolute left-4 top-1/2 -translate-y-1/2 text-ink/35' size={18} />
                <TextInput className='pl-11' type='password' value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
            </Field>
            <div className='rounded-[24px] bg-cloud/70 p-4 text-sm leading-7 text-ink/65'>
              デモ認証情報はあらかじめ入力済みです。別値を入れるとログイン失敗メッセージを確認できます。
            </div>
            <Button className='w-full' type='submit'>
              モックアップに入る
              <ArrowRight size={16} />
            </Button>
          </form>

          <div className='mt-6 flex flex-wrap gap-3'>
            <Button type='button' variant='ghost' onClick={() => setInfoOpen('register')}>
              新規登録
            </Button>
            <Button type='button' variant='ghost' onClick={() => setInfoOpen('reset')}>
              パスワード再設定
            </Button>
          </div>

          <Modal
            open={infoOpen !== null}
            onClose={() => setInfoOpen(null)}
            title={infoOpen === 'register' ? '新規登録は未実装です' : 'パスワード再設定は未実装です'}
            description='このモックアップでは認証後の主要画面と月次運用体験を優先しているため、認証周辺は導線のみを用意しています。'
            footer={
              <Button type='button' onClick={() => setInfoOpen(null)}>
                閉じる
              </Button>
            }
          >
            <div className='rounded-[24px] bg-soft p-4 text-sm leading-7 text-ink/65'>
              本番実装ではここから個別画面へ接続する想定です。今回のモックアップではログイン体験を入口として固定しています。
            </div>
          </Modal>
        </Card>
      </div>
    </div>
  );
}

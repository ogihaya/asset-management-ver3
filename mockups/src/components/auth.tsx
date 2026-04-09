import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from './ui';

export interface AuthBannerState {
  tone: 'success' | 'warning' | 'info';
  title: string;
  description?: string;
}

export function AuthScreen({
  title,
  description,
  banner,
  children,
  footer,
}: {
  title: string;
  description: string;
  banner?: AuthBannerState | null;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(47,125,92,0.18),_transparent_30%),linear-gradient(180deg,#f7f5ef_0%,#fbfaf7_100%)] px-4 py-8'>
      <div className='mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center'>
        <Card className='w-full rounded-[36px] p-8 lg:p-10'>
          <div className='inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white'>
            <Sparkles size={16} />
            AssetWise Mockups
          </div>
          <h1 className='mt-8 text-3xl font-semibold leading-tight text-ink lg:text-4xl'>{title}</h1>
          <p className='mt-4 text-sm leading-7 text-ink/65'>{description}</p>
          {banner ? <AuthBanner banner={banner} /> : null}
          <div className='mt-8 space-y-5'>{children}</div>
          {footer ? <div className='mt-6'>{footer}</div> : null}
        </Card>
      </div>
    </div>
  );
}

export function AuthBanner({ banner }: { banner: AuthBannerState }) {
  return (
    <div
      className={
        banner.tone === 'success'
          ? 'mt-6 rounded-[24px] border border-pine/15 bg-pine/10 px-4 py-4 text-sm text-pine'
          : banner.tone === 'warning'
            ? 'mt-6 rounded-[24px] border border-amber/20 bg-amber/10 px-4 py-4 text-sm text-amber'
            : 'mt-6 rounded-[24px] border border-ink/10 bg-soft px-4 py-4 text-sm text-ink/70'
      }
    >
      <div className='font-semibold'>{banner.title}</div>
      {banner.description ? <div className='mt-1 leading-6'>{banner.description}</div> : null}
    </div>
  );
}

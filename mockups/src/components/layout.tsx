import { BarChart3, CalendarDays, Landmark, LogOut, PiggyBank, Settings2, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useAppStore } from '../app/store';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/dashboard', label: 'ダッシュボード', icon: BarChart3 },
  { to: '/monthly-record', label: '月次記録', icon: CalendarDays },
  { to: '/life-plan', label: 'ライフプラン', icon: Landmark },
  { to: '/settings', label: '設定', icon: Settings2 },
];

function NavItems({ compact = false }: { compact?: boolean }) {
  return (
    <nav className={cn('flex gap-2', compact ? 'items-center' : 'flex-col')}>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                compact && 'px-3 py-2',
                isActive ? 'bg-ink text-white shadow-float' : 'text-ink/65 hover:bg-white',
              )
            }
          >
            <Icon size={18} />
            <span className={compact ? 'hidden sm:inline' : ''}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const { state, logout } = useAppStore();
  const [open, setOpen] = useState(false);

  return (
    <div className='relative'>
      <button
        className='flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white text-ink shadow-sm'
        onClick={() => setOpen((current) => !current)}
        type='button'
      >
        <User size={18} />
      </button>
      {open ? (
        <div className='absolute right-0 top-14 w-64 rounded-3xl border border-ink/10 bg-white p-4 shadow-float'>
          <div className='text-sm font-semibold text-ink'>{state.user.name}</div>
          <div className='mt-1 text-xs text-ink/55'>{state.user.email}</div>
          <button
            className='mt-4 flex w-full items-center gap-2 rounded-2xl border border-ink/10 px-3 py-3 text-sm text-ink/70 hover:bg-cloud'
            onClick={logout}
            type='button'
          >
            <LogOut size={16} />
            ログアウト
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AuthenticatedShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className='min-h-screen bg-mist'>
      <div className='mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:px-8'>
        <aside className='hidden w-72 shrink-0 rounded-[32px] border border-ink/10 bg-white/70 p-6 shadow-panel lg:flex lg:flex-col'>
          <div className='flex items-center gap-3 text-2xl font-semibold text-ink'>
            <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white'>
              <PiggyBank size={22} />
            </div>
            AssetWise
          </div>
          <p className='mt-3 text-sm leading-6 text-ink/55'>月次記録と将来計画から、毎月の投資判断を組み立てるためのモックアップです。</p>
          <div className='mt-10'>
            <NavItems />
          </div>
          <div className='mt-auto flex items-center justify-between rounded-[28px] bg-cloud/70 p-4'>
            <div>
              <div className='text-sm font-medium text-ink'>デモユーザー</div>
              <div className='mt-1 text-xs text-ink/55'>mobile / desktop 両対応</div>
            </div>
            <UserMenu />
          </div>
        </aside>

        <div className='flex-1'>
          <header className='mb-5 flex items-center justify-between gap-4 rounded-[28px] border border-ink/10 bg-white/80 px-4 py-4 shadow-panel lg:hidden'>
            <div>
              <div className='text-base font-semibold text-ink'>AssetWise</div>
              <div className='text-xs text-ink/55'>モックアップ</div>
            </div>
            <div className='flex items-center gap-2'>
              <NavItems compact />
              <UserMenu />
            </div>
          </header>

          <main className='space-y-6'>
            <div className='flex flex-col gap-4 rounded-[32px] border border-ink/10 bg-white/75 px-5 py-5 shadow-panel sm:flex-row sm:items-end sm:justify-between'>
              <div>
                <h1 className='text-3xl font-semibold text-ink'>{title}</h1>
                {subtitle ? <p className='mt-2 max-w-3xl text-sm leading-6 text-ink/55'>{subtitle}</p> : null}
              </div>
              {actions ? <div className='shrink-0'>{actions}</div> : null}
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

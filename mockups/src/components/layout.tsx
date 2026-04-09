import {
  BarChart3,
  CalendarDays,
  GripVertical,
  Landmark,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  Settings2,
  User,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../app/store';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/dashboard', label: 'ダッシュボード', icon: BarChart3 },
  { to: '/monthly-record', label: '月次記録', icon: CalendarDays },
  { to: '/life-plan', label: 'ライフプラン', icon: Landmark },
  { to: '/settings', label: '設定', icon: Settings2 },
];

const LAYOUT_STORAGE_KEY = 'asset-management-mockups-layout-v1';
const SIDEBAR_COLLAPSED_WIDTH = 88;
const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_DEFAULT_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 360;

function clampSidebarWidth(value: number) {
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, Math.round(value)));
}

function readLayoutPrefs() {
  if (typeof window === 'undefined') {
    return { sidebarWidth: SIDEBAR_DEFAULT_WIDTH, sidebarCollapsed: false };
  }

  try {
    const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (stored === null) {
      return { sidebarWidth: SIDEBAR_DEFAULT_WIDTH, sidebarCollapsed: false };
    }

    const parsed = JSON.parse(stored) as { sidebarWidth?: number; sidebarCollapsed?: boolean };
    return {
      sidebarWidth: clampSidebarWidth(parsed.sidebarWidth ?? SIDEBAR_DEFAULT_WIDTH),
      sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
    };
  } catch {
    return { sidebarWidth: SIDEBAR_DEFAULT_WIDTH, sidebarCollapsed: false };
  }
}

function NavItems({
  orientation = 'vertical',
  collapsed = false,
}: {
  orientation?: 'vertical' | 'horizontal';
  collapsed?: boolean;
}) {
  const horizontal = orientation === 'horizontal';

  return (
    <nav className={cn('flex', horizontal ? 'items-center gap-2' : 'flex-col gap-2')}>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            title={collapsed || horizontal ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center rounded-2xl text-sm font-medium transition duration-200',
                horizontal && 'h-11 w-11 justify-center',
                !horizontal && collapsed && 'h-12 justify-center px-0',
                !horizontal && !collapsed && 'gap-3 px-4 py-3',
                isActive ? 'bg-ink text-white shadow-sm' : 'text-ink/65 hover:bg-cloud',
              )
            }
          >
            <Icon size={18} />
            {!horizontal && !collapsed ? <span>{item.label}</span> : null}
          </NavLink>
        );
      })}
    </nav>
  );
}

function UserMenu({ placement }: { placement: 'desktop' | 'mobile' }) {
  const { state, logout } = useAppStore();
  const [open, setOpen] = useState(false);

  return (
    <div className='relative'>
      <button
        className='flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white text-ink shadow-sm transition hover:-translate-y-0.5'
        onClick={() => setOpen((current) => !current)}
        type='button'
      >
        <User size={18} />
      </button>
      {open ? (
        <div
          className={cn(
            'absolute z-50 w-64 rounded-[28px] border border-ink/10 bg-white p-4 shadow-float',
            placement === 'mobile' && 'right-0 top-14',
            placement === 'desktop' && 'bottom-2 left-[calc(100%+12px)]',
          )}
        >
          <div className='text-sm font-semibold text-ink'>{state.user.name}</div>
          <div className='mt-1 text-xs text-ink/55'>{state.user.email}</div>
          <button
            className='mt-4 flex w-full items-center gap-2 rounded-2xl border border-ink/10 px-3 py-3 text-sm text-ink/70 transition hover:bg-cloud'
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

export function AuthenticatedShell({
  title,
  subtitle,
  actions,
  stickyBottomAction,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  stickyBottomAction?: ReactNode;
  children: ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(function () {
    return readLayoutPrefs().sidebarWidth;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(function () {
    return readLayoutPrefs().sidebarCollapsed;
  });
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(function () {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({ sidebarWidth, sidebarCollapsed }),
    );
  }, [sidebarCollapsed, sidebarWidth]);

  const handlePointerMove = useCallback(function (event: PointerEvent) {
    if (dragStateRef.current === null) {
      return;
    }

    const delta = event.clientX - dragStateRef.current.startX;
    setSidebarWidth(clampSidebarWidth(dragStateRef.current.startWidth + delta));
  }, []);

  const stopResize = useCallback(function () {
    dragStateRef.current = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopResize);
  }, [handlePointerMove]);

  useEffect(
    function () {
      return function () {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', stopResize);
      };
    },
    [handlePointerMove, stopResize],
  );

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (sidebarCollapsed) {
      return;
    }

    dragStateRef.current = { startX: event.clientX, startWidth: sidebarWidth };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
  }

  const activeSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;

  return (
    <div
      className='min-h-screen bg-mist'
      style={{ ['--sidebar-width' as string]: activeSidebarWidth + 'px' }}
    >
      <div className='flex min-h-screen w-full'>
        <aside
          className='relative hidden shrink-0 self-start border-r border-ink/10 bg-white/94 backdrop-blur lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col'
          style={{ width: activeSidebarWidth }}
        >
          <div className='flex h-full min-h-0 flex-col'>
            <div className={cn('border-b border-ink/10', sidebarCollapsed ? 'px-3 py-4' : 'px-5 py-5')}>
              <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'justify-between gap-3')}>
                <div className='flex items-center gap-3 overflow-hidden'>
                  <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-white'>
                    <PiggyBank size={21} />
                  </div>
                  {!sidebarCollapsed ? <div className='text-xl font-semibold text-ink'>AssetWise</div> : null}
                </div>
                {!sidebarCollapsed ? (
                  <button
                    className='flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-ink/10 text-ink/70 transition hover:bg-cloud'
                    onClick={() => setSidebarCollapsed(true)}
                    title='サイドメニューを閉じる'
                    type='button'
                  >
                    <PanelLeftClose size={18} />
                  </button>
                ) : null}
              </div>
              {!sidebarCollapsed ? (
                <p className='mt-4 text-sm leading-6 text-ink/55'>
                  月次記録と将来計画から、毎月の投資判断を組み立てるためのモックアップです。
                </p>
              ) : null}
            </div>

            <div className={cn('flex-1 overflow-y-auto', sidebarCollapsed ? 'px-3 py-4' : 'px-4 py-5')}>
              {sidebarCollapsed ? (
                <div className='mb-4 flex justify-center'>
                  <button
                    className='flex h-10 w-10 items-center justify-center rounded-2xl border border-ink/10 text-ink/70 transition hover:bg-cloud'
                    onClick={() => setSidebarCollapsed(false)}
                    title='サイドメニューを開く'
                    type='button'
                  >
                    <PanelLeftOpen size={18} />
                  </button>
                </div>
              ) : null}
              <NavItems collapsed={sidebarCollapsed} />
            </div>

            <div className={cn('border-t border-ink/10', sidebarCollapsed ? 'px-3 py-4' : 'px-4 py-4')}>
              {sidebarCollapsed ? (
                <div className='flex justify-center'>
                  <UserMenu placement='desktop' />
                </div>
              ) : (
                <div className='flex items-center justify-between gap-3 rounded-[24px] bg-soft px-4 py-3'>
                  <div className='min-w-0'>
                    <div className='truncate text-sm font-semibold text-ink'>{'デモユーザー'}</div>
                    <div className='truncate text-xs text-ink/55'>desktop / mobile 両対応</div>
                  </div>
                  <UserMenu placement='desktop' />
                </div>
              )}
            </div>
          </div>

          {!sidebarCollapsed ? (
            <button
              aria-label='サイドメニューの幅を変更'
              className='absolute right-0 top-0 hidden h-full w-5 translate-x-1/2 cursor-col-resize items-center justify-center lg:flex'
              onPointerDown={startResize}
              type='button'
            >
              <span className='flex h-16 w-3 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/35 shadow-sm'>
                <GripVertical size={14} />
              </span>
            </button>
          ) : null}
        </aside>

        <div className='flex min-w-0 flex-1 flex-col'>
          <header className='sticky top-0 z-40 border-b border-ink/10 bg-white/90 px-4 py-3 backdrop-blur lg:hidden'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className='text-base font-semibold text-ink'>AssetWise</div>
                <div className='text-xs text-ink/55'>モックアップ</div>
              </div>
              <div className='flex items-center gap-2'>
                <NavItems orientation='horizontal' />
                <UserMenu placement='mobile' />
              </div>
            </div>
          </header>

          <div className='flex-1 px-4 py-4 sm:px-6 lg:px-6 lg:py-6'>
            <main className={cn('space-y-6', stickyBottomAction ? 'pb-36' : '')}>
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

      {stickyBottomAction ? (
        <div className='pointer-events-none fixed bottom-4 left-4 right-4 z-30 lg:left-[calc(var(--sidebar-width)+24px)] lg:right-6'>
          <div className='pointer-events-auto rounded-[26px] border border-ink/10 bg-white/94 p-3 shadow-float backdrop-blur'>
            {stickyBottomAction}
          </div>
        </div>
      ) : null}
    </div>
  );
}

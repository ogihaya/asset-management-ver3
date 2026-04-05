import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import type { ToastMessage } from '../types';
import { cn, formatCurrency } from '../lib/utils';

export function Button({
  className,
  variant = 'primary',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-ink text-white shadow-float hover:-translate-y-0.5',
        variant === 'secondary' && 'border border-ink/15 bg-white text-ink hover:bg-cloud',
        variant === 'ghost' && 'bg-transparent text-ink hover:bg-ink/5',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-500',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/15',
        props.className,
      )}
      {...props}
    />
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-[28px] border border-ink/10 bg-white p-5 shadow-panel animate-rise', className)}>
      {(title || description || action) && (
        <header className='mb-5 flex items-start justify-between gap-4'>
          <div>
            {title ? <h2 className='text-lg font-semibold text-ink'>{title}</h2> : null}
            {description ? <p className='mt-1 text-sm text-ink/60'>{description}</p> : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <Card className='rounded-[24px] bg-gradient-to-br from-white to-cloud/70 p-4'>
      <div className='text-sm text-ink/60'>{label}</div>
      <div className='mt-3 text-2xl font-semibold text-ink'>{value}</div>
      {note ? <div className='mt-2 text-xs text-ink/45'>{note}</div> : null}
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className='rounded-[24px] border border-dashed border-ink/20 bg-soft p-6 text-center'>
      <div className='text-base font-semibold text-ink'>{title}</div>
      <div className='mt-2 text-sm text-ink/60'>{description}</div>
    </div>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        tone === 'neutral' && 'bg-ink/6 text-ink/70',
        tone === 'success' && 'bg-pine/12 text-pine',
        tone === 'warning' && 'bg-amber/12 text-amber',
      )}
    >
      {children}
    </span>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className='block'>
      <div className='mb-2 flex items-center justify-between'>
        <span className='text-sm font-medium text-ink'>{label}</span>
        {hint ? <span className='text-xs text-ink/45'>{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

export function InfoList({
  rows,
}: {
  rows: Array<{ label: string; value: ReactNode; emphasize?: boolean }>;
}) {
  return (
    <dl className='space-y-3'>
      {rows.map((row) => (
        <div key={row.label} className='flex items-center justify-between gap-3'>
          <dt className='text-sm text-ink/55'>{row.label}</dt>
          <dd className={cn('text-sm text-right text-ink', row.emphasize && 'font-semibold')}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm'>
      <div className='w-full max-w-lg rounded-[28px] bg-white p-6 shadow-float'>
        <div className='mb-4 flex items-start justify-between gap-4'>
          <div>
            <h3 className='text-xl font-semibold text-ink'>{title}</h3>
            {description ? <p className='mt-2 text-sm text-ink/60'>{description}</p> : null}
          </div>
          <button className='rounded-full border border-ink/10 p-2 text-ink/60' onClick={onClose} type='button'>
            <X size={16} />
          </button>
        </div>
        <div className='space-y-4'>{children}</div>
        {footer ? <div className='mt-6 flex justify-end gap-3'>{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = '削除する',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button type='button' variant='secondary' onClick={onClose}>
            キャンセル
          </Button>
          <Button type='button' variant='danger' onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className='rounded-2xl bg-red-50 p-4 text-sm text-red-700'>この操作はモックアップ上のデータにも反映されます。</div>
    </Modal>
  );
}

export function ToastViewport({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className='pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-3'>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto rounded-3xl border px-4 py-4 shadow-float',
            toast.tone === 'success' && 'border-pine/20 bg-white',
            toast.tone === 'warning' && 'border-amber/25 bg-white',
            toast.tone === 'info' && 'border-ink/10 bg-white',
          )}
        >
          <div className='flex items-start justify-between gap-3'>
            <div>
              <div className='text-sm font-semibold text-ink'>{toast.title}</div>
              {toast.description ? <div className='mt-1 text-xs text-ink/55'>{toast.description}</div> : null}
            </div>
            <button className='rounded-full p-1 text-ink/50' onClick={() => onDismiss(toast.id)} type='button'>
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function CurrencyHint({ value }: { value: number | null }) {
  return <span className='text-xs text-ink/45'>{formatCurrency(value)}</span>;
}

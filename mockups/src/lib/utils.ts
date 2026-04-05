export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function formatCurrency(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '未入力';
  }

  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function toNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const numeric = Number(value.replace(/,/g, ''));
  return Number.isNaN(numeric) ? null : numeric;
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

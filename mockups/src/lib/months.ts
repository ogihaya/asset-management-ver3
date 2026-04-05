import type { MonthKey } from '../types';

export function parseMonthKey(month: MonthKey): Date {
  const [year, monthPart] = month.split('-').map(Number);
  return new Date(year, monthPart - 1, 1);
}

export function formatMonthKey(date: Date): MonthKey {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const date = parseMonthKey(month);
  date.setMonth(date.getMonth() + delta);
  return formatMonthKey(date);
}

export function compareMonths(a: MonthKey, b: MonthKey): number {
  return parseMonthKey(a).getTime() - parseMonthKey(b).getTime();
}

export function diffMonths(from: MonthKey, to: MonthKey): number {
  const fromDate = parseMonthKey(from);
  const toDate = parseMonthKey(to);
  return (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());
}

export function formatMonthLabel(month: MonthKey): string {
  const date = parseMonthKey(month);
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;
}

export function monthRange(start: MonthKey, end: MonthKey): MonthKey[] {
  const distance = diffMonths(start, end);
  return Array.from({ length: distance + 1 }, (_, index) => addMonths(start, index));
}

export function isMonthVisible(target: MonthKey, from: MonthKey, to?: MonthKey): boolean {
  const fromOk = compareMonths(target, from) >= 0;
  const toOk = to ? compareMonths(target, to) <= 0 : true;
  return fromOk && toOk;
}

export function isPastDeadline(month: MonthKey, reference = new Date()): boolean {
  const date = parseMonthKey(month);
  const deadline = new Date(date.getFullYear(), date.getMonth() + 2, 0, 23, 59, 59, 999);
  return reference.getTime() > deadline.getTime();
}

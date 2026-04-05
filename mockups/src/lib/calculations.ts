import { addMonths, compareMonths, diffMonths, isMonthVisible, monthRange } from './months';
import type {
  AllocationResult,
  AppState,
  AssetDefinition,
  IncomeDefinition,
  InvestmentComputation,
  InvestmentTarget,
  ListedItem,
  MonthKey,
  MonthlyRecord,
  NameHistoryItem,
  SettingsRevision,
  VisibilityPeriod,
} from '../types';

function sortByMonth<T extends { month: MonthKey }>(items: T[]): T[] {
  return [...items].sort((left, right) => compareMonths(left.month, right.month));
}

function latestName(history: NameHistoryItem[], month: MonthKey): string {
  const filtered = [...history]
    .filter((item) => compareMonths(item.from, month) <= 0)
    .sort((left, right) => compareMonths(left.from, right.from));
  const last = filtered[filtered.length - 1];
  return last?.name ?? history[0]?.name ?? '';
}

function isVisible(periods: VisibilityPeriod[], month: MonthKey): boolean {
  return periods.some((period) => isMonthVisible(month, period.from, period.to));
}

function sumValues(values: Record<string, number | null>): number {
  return Object.values(values).reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function getSortedMonths(state: AppState): MonthKey[] {
  return [...state.months].sort(compareMonths);
}

export function getRecord(state: AppState, month: MonthKey): MonthlyRecord | undefined {
  return state.monthlyRecords.find((record) => record.month === month);
}

export function getLatestConfirmedMonth(state: AppState): MonthKey | null {
  const confirmed = sortByMonth(state.monthlyRecords.filter((record) => record.confirmed));
  return confirmed[confirmed.length - 1]?.month ?? null;
}

export function getFirstUnconfirmedMonth(state: AppState): MonthKey | null {
  const unconfirmed = sortByMonth(state.monthlyRecords.filter((record) => !record.confirmed));
  return unconfirmed[0]?.month ?? null;
}

export function getSettingsForMonth(state: AppState, month: MonthKey): SettingsRevision {
  const filtered = [...state.settingsHistory]
    .filter((item) => compareMonths(item.effectiveFrom, month) <= 0)
    .sort((left, right) => compareMonths(left.effectiveFrom, right.effectiveFrom));
  return filtered[filtered.length - 1] ?? state.settingsHistory[0];
}

export function getNameForAsset(asset: AssetDefinition, month: MonthKey): string {
  return latestName(asset.nameHistory, month);
}

export function getNameForIncome(income: IncomeDefinition, month: MonthKey): string {
  return latestName(income.nameHistory, month);
}

export function isAssetVisibleInMonth(asset: AssetDefinition, month: MonthKey): boolean {
  return isVisible(asset.periods, month);
}

export function isIncomeVisibleInMonth(income: IncomeDefinition, month: MonthKey): boolean {
  return isVisible(income.periods, month);
}

export function getVisibleAssets(state: AppState, month: MonthKey): ListedItem[] {
  const record = getRecord(state, month);
  return state.assets
    .filter((asset) => isAssetVisibleInMonth(asset, month))
    .map((asset) => ({
      id: asset.id,
      name: getNameForAsset(asset, month),
      value: record?.assetValues[asset.id] ?? null,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'ja'));
}

export function getDeletedAssets(state: AppState, month: MonthKey): ListedItem[] {
  return state.assets
    .filter((asset) => !isAssetVisibleInMonth(asset, month))
    .filter((asset) => asset.periods.some((period) => period.to && compareMonths(period.to, month) < 0))
    .map((asset) => ({
      id: asset.id,
      name: getNameForAsset(asset, addMonths(month, -1)),
      value: null,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'ja'));
}

export function getVisibleIncomes(state: AppState, month: MonthKey): ListedItem[] {
  const record = getRecord(state, month);
  return state.incomes
    .filter((income) => isIncomeVisibleInMonth(income, month))
    .map((income) => ({
      id: income.id,
      name: getNameForIncome(income, month),
      value: record?.incomeValues[income.id] ?? null,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'ja'));
}

export function getTargetsForMonth(state: AppState, month: MonthKey): InvestmentTarget[] {
  return getSettingsForMonth(state, month).targets;
}

export function getTotalAssetsForMonth(state: AppState, month: MonthKey): number {
  return getVisibleAssets(state, month).reduce((sum, asset) => sum + (asset.value ?? 0), 0);
}

export function getTotalIncomeForMonth(state: AppState, month: MonthKey): number {
  return getVisibleIncomes(state, month).reduce((sum, income) => sum + (income.value ?? 0), 0);
}

export function getTotalInvestmentForMonth(state: AppState, month: MonthKey): number {
  const record = getRecord(state, month);
  return record ? sumValues(record.investmentAmounts) : 0;
}

export function getExpenseEstimate(state: AppState, month: MonthKey): number | null {
  const previousMonth = addMonths(month, -1);
  const previousRecord = getRecord(state, previousMonth);
  const currentRecord = getRecord(state, month);

  if (!previousRecord || !currentRecord) {
    return null;
  }

  const previousAssets = getTotalAssetsForMonth(state, previousMonth);
  const currentIncome = getTotalIncomeForMonth(state, month);
  const currentAssets = getTotalAssetsForMonth(state, month);

  return Math.max(0, previousAssets + currentIncome - currentAssets);
}

export function getResolvedExpense(state: AppState, month: MonthKey): number | null {
  const record = getRecord(state, month);
  if (!record) {
    return null;
  }

  return record.expenseOverride ?? getExpenseEstimate(state, month);
}

export function getConfirmability(state: AppState, month: MonthKey): { canConfirm: boolean; reason?: string } {
  const record = getRecord(state, month);
  if (!record) {
    return { canConfirm: false, reason: '対象月のデータがありません。' };
  }

  if (record.confirmed) {
    return { canConfirm: false, reason: 'この月はすでに確定済みです。' };
  }

  const firstUnconfirmed = getFirstUnconfirmedMonth(state);
  if (firstUnconfirmed && firstUnconfirmed !== month) {
    return {
      canConfirm: false,
      reason: `古い未確定月から順に確定する必要があります。まずは ${firstUnconfirmed} を確定してください。`,
    };
  }

  return { canConfirm: true };
}

export function getLatestDataMonth(state: AppState): MonthKey {
  const records = sortByMonth(state.monthlyRecords);
  const lastWithAssets = [...records]
    .reverse()
    .find((record) => Object.values(record.assetValues).some((value) => value !== null));

  return lastWithAssets?.month ?? records[records.length - 1]?.month ?? state.months[0];
}

function getAverageIncome(state: AppState, month: MonthKey): number | null {
  const history = getSortedMonths(state)
    .filter((item) => compareMonths(item, month) <= 0)
    .map((item) => getTotalIncomeForMonth(state, item))
    .filter((value) => value > 0)
    .slice(-3);

  return average(history);
}

function getAverageExpense(state: AppState, month: MonthKey): number | null {
  const history = getSortedMonths(state)
    .filter((item) => compareMonths(item, month) <= 0)
    .map((item) => getResolvedExpense(state, item))
    .filter((value): value is number => value !== null)
    .slice(-3);

  return average(history);
}

function allocate(investableAmount: number, targets: InvestmentTarget[]): AllocationResult[] {
  const raw = targets.map((target) => ({
    ...target,
    amount: Math.floor((investableAmount * target.ratio) / 100),
  }));
  const allocated = raw.reduce((sum, item) => sum + item.amount, 0);
  const remainder = investableAmount - allocated;

  if (remainder > 0 && raw.length > 0) {
    const highest = [...raw].sort((left, right) => right.ratio - left.ratio)[0];
    highest.amount += remainder;
  }

  return raw.map((item) => ({
    targetId: item.id,
    targetName: item.name,
    ratio: item.ratio,
    amount: item.amount,
  }));
}

export function getInvestmentComputation(state: AppState, month: MonthKey): InvestmentComputation {
  const reasons: string[] = [];
  const settings = getSettingsForMonth(state, month);
  const targets = settings.targets;
  const upcomingPlans = [...state.lifePlans]
    .filter((plan) => compareMonths(plan.month, month) >= 0)
    .sort((left, right) => compareMonths(left.month, right.month));
  const targetEvent = upcomingPlans[0] ?? null;

  if (!targetEvent) {
    reasons.push('ライフプランが未登録です。');
  }

  if (targets.length === 0) {
    reasons.push('投資先配分が未設定です。');
  }

  const ratioTotal = targets.reduce((sum, target) => sum + target.ratio, 0);
  if (targets.length > 0 && ratioTotal !== 100) {
    reasons.push('投資先配分の合計比率が100%ではありません。');
  }

  const monthlyIncome = getTotalIncomeForMonth(state, month) || getAverageIncome(state, month);
  const monthlyExpense = getResolvedExpense(state, month) ?? getAverageExpense(state, month);

  if (monthlyIncome === null) {
    reasons.push('収入データが不足しています。');
  }

  if (monthlyExpense === null) {
    reasons.push('支出データが不足しています。');
  }

  if (reasons.length > 0 || !targetEvent || monthlyIncome === null || monthlyExpense === null) {
    return {
      available: false,
      reasons,
      targetEvent,
      monthsUntilEvent: 0,
      cumulativeIncome: 0,
      cumulativeExpense: 0,
      surplusAssets: 0,
      investableAmount: 0,
      allocations: [],
    };
  }

  const monthsUntilEvent = diffMonths(month, targetEvent.month) + 1;
  const eventCost = upcomingPlans
    .filter((plan) => compareMonths(plan.month, targetEvent.month) <= 0)
    .reduce((sum, plan) => sum + plan.amount, 0);
  const cumulativeIncome = monthlyIncome * monthsUntilEvent;
  const cumulativeExpense = monthlyExpense * monthsUntilEvent + eventCost;
  const surplusAssets = cumulativeIncome - cumulativeExpense - settings.emergencyFund;
  const investableAmount = Math.max(0, Math.floor(surplusAssets / monthsUntilEvent));

  return {
    available: true,
    reasons: [],
    targetEvent,
    monthsUntilEvent,
    cumulativeIncome,
    cumulativeExpense,
    surplusAssets,
    investableAmount,
    allocations: allocate(investableAmount, targets),
  };
}

export function buildTrendData(state: AppState, subject: string) {
  return getSortedMonths(state).map((month) => {
    const base = { month, label: month, value: 0 };

    if (subject === 'total-assets') {
      return { ...base, value: getTotalAssetsForMonth(state, month) };
    }

    if (subject === 'income') {
      return { ...base, value: getTotalIncomeForMonth(state, month) };
    }

    if (subject === 'expense') {
      return { ...base, value: getResolvedExpense(state, month) ?? 0 };
    }

    const record = getRecord(state, month);
    return { ...base, value: record?.assetValues[subject] ?? 0 };
  });
}

export function getDisplayMonthOptions(state: AppState): MonthKey[] {
  return getSortedMonths(state);
}

export function getNextSettingsEffectiveMonth(state: AppState): MonthKey | null {
  return getFirstUnconfirmedMonth(state);
}

export function getMonthsBetween(start: MonthKey, end: MonthKey): MonthKey[] {
  return monthRange(start, end);
}

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
  ForecastSummary,
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

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getForecastBaseMonths(state: AppState, month: MonthKey): MonthKey[] {
  return getSortedMonths(state)
    .filter((item) => compareMonths(item, month) <= 0)
    .filter((item) => getRecord(state, item)?.confirmed === true)
    .slice(-6);
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
    }));
}

export function getDeletedAssets(state: AppState, month: MonthKey): ListedItem[] {
  return state.assets
    .filter((asset) => !isAssetVisibleInMonth(asset, month))
    .filter((asset) => asset.periods.some((period) => period.to && compareMonths(period.to, month) < 0))
    .map((asset) => ({
      id: asset.id,
      name: getNameForAsset(asset, addMonths(month, -1)),
      value: null,
    }));
}

export function getVisibleIncomes(state: AppState, month: MonthKey): ListedItem[] {
  const record = getRecord(state, month);
  return state.incomes
    .filter((income) => isIncomeVisibleInMonth(income, month))
    .map((income) => ({
      id: income.id,
      name: getNameForIncome(income, month),
      value: record?.incomeValues[income.id] ?? null,
    }));
}

export function getTargetsForMonth(state: AppState, month: MonthKey): InvestmentTarget[] {
  return getSettingsForMonth(state, month).targets;
}

export function getTargetValuationsForMonth(state: AppState, month: MonthKey) {
  const record = getRecord(state, month);
  return getTargetsForMonth(state, month).map(function (target) {
    return {
      id: target.id,
      name: target.name,
      ratio: target.ratio,
      value: record?.investmentValuations[target.id] ?? null,
    };
  });
}

export function getTotalInvestmentValuationForMonth(state: AppState, month: MonthKey): number {
  return getTargetValuationsForMonth(state, month).reduce(function (sum, target) {
    return sum + (target.value ?? 0);
  }, 0);
}

export function getInvestmentCompositionForMonth(state: AppState, month: MonthKey) {
  const targets = getTargetValuationsForMonth(state, month);
  const totalValue = targets.reduce(function (sum, target) {
    return sum + (target.value ?? 0);
  }, 0);

  return {
    totalValue,
    items: targets.map(function (target) {
      const actualRatio = totalValue > 0 && target.value !== null ? Number((((target.value ?? 0) / totalValue) * 100).toFixed(2)) : null;
      const deltaRatio = actualRatio === null ? null : Number((actualRatio - target.ratio).toFixed(2));

      return {
        ...target,
        actualRatio,
        deltaRatio,
      };
    }),
  };
}

export function getTotalAssetsForMonth(state: AppState, month: MonthKey): number {
  return (
    getVisibleAssets(state, month).reduce((sum, asset) => sum + (asset.value ?? 0), 0) +
    getTotalInvestmentValuationForMonth(state, month)
  );
}

export function getTotalIncomeForMonth(state: AppState, month: MonthKey): number {
  return getVisibleIncomes(state, month).reduce((sum, income) => sum + (income.value ?? 0), 0);
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

function getMissingMonthlyInputs(state: AppState, month: MonthKey): string[] {
  const record = getRecord(state, month);
  if (!record) {
    return [];
  }

  const missing: string[] = [];

  const hasMissingAssets = getVisibleAssets(state, month).some(function (asset) {
    return record.assetValues[asset.id] === null || record.assetValues[asset.id] === undefined;
  });
  if (hasMissingAssets) {
    missing.push('資産');
  }

  const hasMissingIncomes = getVisibleIncomes(state, month).some(function (income) {
    return record.incomeValues[income.id] === null || record.incomeValues[income.id] === undefined;
  });
  if (hasMissingIncomes) {
    missing.push('収入');
  }

  const hasMissingInvestments = getTargetsForMonth(state, month).some(function (target) {
    return record.investmentValuations[target.id] === null || record.investmentValuations[target.id] === undefined;
  });
  if (hasMissingInvestments) {
    missing.push('投資評価額');
  }

  return missing;
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

  const missingInputs = getMissingMonthlyInputs(state, month);
  if (missingInputs.length > 0) {
    return {
      canConfirm: false,
      reason: `未入力の項目があります。${missingInputs.join('、')}をすべて入力してください。`,
    };
  }

  return { canConfirm: true };
}

export function getLatestDataMonth(state: AppState): MonthKey {
  const records = sortByMonth(state.monthlyRecords);
  const lastWithAssets = [...records]
    .reverse()
    .find(
      (record) =>
        Object.values(record.assetValues).some((value) => value !== null) ||
        Object.values(record.investmentValuations).some((value) => value !== null),
    );

  return lastWithAssets?.month ?? records[records.length - 1]?.month ?? state.months[0];
}

export function getForecastSummary(state: AppState, month: MonthKey): ForecastSummary {
  const baseMonths = getForecastBaseMonths(state, month);
  const incomeHistory = baseMonths.map(function (item) {
    return getTotalIncomeForMonth(state, item);
  });
  const expenseHistory = baseMonths
    .map(function (item) {
      return getResolvedExpense(state, item);
    })
    .filter((value): value is number => value !== null);

  return {
    monthlyIncome: average(incomeHistory),
    monthlyExpense: average(expenseHistory),
    sampleMonths: baseMonths.length,
  };
}

function allocate(state: AppState, investableAmount: number, targets: InvestmentTarget[]): AllocationResult[] {
  const latestConfirmedMonth = getLatestConfirmedMonth(state);
  const latestConfirmedRecord = latestConfirmedMonth ? getRecord(state, latestConfirmedMonth) : null;
  const currentTargets = targets.map(function (target, index) {
    return {
      ...target,
      index,
      currentValuation: latestConfirmedRecord?.investmentValuations[target.id] ?? 0,
    };
  });

  if (investableAmount <= 0) {
    return currentTargets.map(function (target) {
      return {
        targetId: target.id,
        targetName: target.name,
        ratio: target.ratio,
        currentValuation: target.currentValuation,
        amount: 0,
      };
    });
  }

  const currentTotal = currentTargets.reduce(function (sum, target) {
    return sum + target.currentValuation;
  }, 0);
  const postTotal = currentTotal + investableAmount;
  const rawTargets = currentTargets.map(function (target) {
    const idealPostValue = (postTotal * target.ratio) / 100;
    const shortfall = Math.max(0, idealPostValue - target.currentValuation);

    return {
      ...target,
      shortfall,
      amount: 0,
    };
  });
  const totalShortfall = rawTargets.reduce(function (sum, target) {
    return sum + target.shortfall;
  }, 0);

  if (totalShortfall <= 0) {
    return rawTargets.map(function (target) {
      return {
        targetId: target.id,
        targetName: target.name,
        ratio: target.ratio,
        currentValuation: target.currentValuation,
        amount: 0,
      };
    });
  }

  const allocatedTargets = rawTargets.map(function (target) {
    return {
      ...target,
      amount: Math.floor((investableAmount * target.shortfall) / totalShortfall),
    };
  });
  let remainder = investableAmount - allocatedTargets.reduce(function (sum, target) {
    return sum + target.amount;
  }, 0);
  const remainderOrder = [...allocatedTargets].sort(function (left, right) {
    if (left.shortfall !== right.shortfall) {
      return right.shortfall - left.shortfall;
    }

    return left.index - right.index;
  });

  while (remainder > 0 && remainderOrder.length > 0) {
    const target = remainderOrder[(investableAmount - remainder) % remainderOrder.length];
    target.amount += 1;
    remainder -= 1;
  }

  return allocatedTargets.map(function (target) {
    return {
      targetId: target.id,
      targetName: target.name,
      ratio: target.ratio,
      currentValuation: target.currentValuation,
      amount: target.amount,
    };
  });
}

export function getInvestmentComputation(state: AppState, month: MonthKey): InvestmentComputation {
  const reasons: string[] = [];
  const settings = getSettingsForMonth(state, month);
  const targets = settings.targets;
  const forecast = getForecastSummary(state, month);
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

  const monthlyIncome = forecast.monthlyIncome;
  const monthlyExpense = forecast.monthlyExpense;

  if (monthlyIncome === null) {
    reasons.push('確定済み月の収入実績がないため将来収入を予測できません。');
  }

  if (monthlyExpense === null) {
    reasons.push('確定済み月の支出実績がないため将来支出を予測できません。');
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
      emergencyFund: settings.emergencyFund,
      investableAmount: 0,
      allocations: [],
    };
  }

  const eventComparisons = upcomingPlans.map(function (plan) {
    const monthsUntilEvent = diffMonths(month, plan.month) + 1;
    const eventCost = upcomingPlans
      .filter(function (item) {
        return compareMonths(item.month, plan.month) <= 0;
      })
      .reduce(function (sum, item) {
        return sum + item.amount;
      }, 0);
    const cumulativeIncome = monthlyIncome * monthsUntilEvent;
    const cumulativeExpense = monthlyExpense * monthsUntilEvent + eventCost;
    const surplusAssets = cumulativeIncome - cumulativeExpense - settings.emergencyFund;
    const investableAmount = Math.max(0, Math.floor(surplusAssets / monthsUntilEvent));

    return {
      plan,
      monthsUntilEvent,
      cumulativeIncome,
      cumulativeExpense,
      surplusAssets,
      investableAmount,
    };
  });

  const selected = [...eventComparisons].sort(function (left, right) {
    if (left.investableAmount !== right.investableAmount) {
      return left.investableAmount - right.investableAmount;
    }

    return compareMonths(left.plan.month, right.plan.month);
  })[0];

  return {
    available: true,
    reasons: [],
    targetEvent: selected.plan,
    monthsUntilEvent: selected.monthsUntilEvent,
    cumulativeIncome: selected.cumulativeIncome,
    cumulativeExpense: selected.cumulativeExpense,
    surplusAssets: selected.surplusAssets,
    emergencyFund: settings.emergencyFund,
    investableAmount: selected.investableAmount,
    allocations: allocate(state, selected.investableAmount, targets),
  };
}

export function buildTrendData(state: AppState, subject: string) {
  return getSortedMonths(state)
    .filter((month) => getRecord(state, month)?.confirmed === true)
    .map((month) => {
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
      return { ...base, value: record?.assetValues[subject] ?? record?.investmentValuations[subject] ?? 0 };
    });
}

export function hasTrendDataForSubject(state: AppState, subject: string): boolean {
  const confirmedMonths = getSortedMonths(state).filter((month) => getRecord(state, month)?.confirmed === true);

  if (confirmedMonths.length === 0) {
    return false;
  }

  if (subject === 'total-assets' || subject === 'income' || subject === 'expense') {
    return true;
  }

  return confirmedMonths.some(function (month) {
    const record = getRecord(state, month);
    const assetValue = record?.assetValues[subject];
    const targetValue = record?.investmentValuations[subject];
    return (assetValue !== undefined && assetValue !== null) || (targetValue !== undefined && targetValue !== null);
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

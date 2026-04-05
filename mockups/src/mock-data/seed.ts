import { addMonths, formatMonthKey, monthRange } from '../lib/months';
import type {
  AppState,
  AssetDefinition,
  IncomeDefinition,
  InvestmentTarget,
  LifePlanEvent,
  MonthKey,
  MonthlyRecord,
  SettingsRevision,
} from '../types';

function createRecord(month: MonthKey): MonthlyRecord {
  return {
    month,
    confirmed: false,
    confirmedAt: null,
    expenseOverride: null,
    assetValues: {},
    incomeValues: {},
    investmentAmounts: {},
  };
}

function asset(id: string, name: string, from: MonthKey, to?: MonthKey): AssetDefinition {
  return {
    id,
    periods: [{ from, ...(to ? { to } : {}) }],
    nameHistory: [{ from, name }],
  };
}

function income(id: string, name: string, from: MonthKey): IncomeDefinition {
  return {
    id,
    periods: [{ from }],
    nameHistory: [{ from, name }],
  };
}

export function createSeedState(reference = new Date()): AppState {
  const currentMonth = formatMonthKey(reference);
  const firstMonth = addMonths(currentMonth, -5);
  const months = monthRange(firstMonth, addMonths(currentMonth, 1));
  const confirmedMonths = new Set([months[0], months[1], months[2]]);

  const targets: InvestmentTarget[] = [
    { id: 'target-world', name: 'eMAXIS Slim 全世界株式', ratio: 50 },
    { id: 'target-sp500', name: 'eMAXIS Slim 米国株式(S&P500)', ratio: 30 },
    { id: 'target-bonds', name: 'たわらノーロード 先進国債券', ratio: 20 },
  ];

  const settingsHistory: SettingsRevision[] = [
    {
      effectiveFrom: firstMonth,
      emergencyFund: 1_200_000,
      targets,
    },
  ];

  const assets: AssetDefinition[] = [
    asset('asset-bank', '住信SBIネット銀行 普通預金', firstMonth),
    asset('asset-paypay', 'PayPay残高', firstMonth),
    asset('asset-card', '楽天カード 引落予定', firstMonth),
    asset('asset-nisa', '新NISA オルカン', firstMonth),
    asset('asset-taxable', '特定口座 S&P500', firstMonth),
    asset('asset-legacy', '旧つみたて口座', firstMonth, months[2]),
  ];

  const incomes: IncomeDefinition[] = [
    income('income-salary', '給与', firstMonth),
    income('income-side', '副収入', firstMonth),
  ];

  const lifePlans: LifePlanEvent[] = [
    {
      id: 'life-moving',
      month: addMonths(currentMonth, 3),
      title: '引っ越し費用',
      amount: 450_000,
      note: '敷金・礼金・引っ越し業者を含む想定。',
    },
    {
      id: 'life-travel',
      month: addMonths(currentMonth, 6),
      title: '家族旅行',
      amount: 180_000,
      note: '夏休みの国内旅行。',
    },
    {
      id: 'life-pc',
      month: addMonths(currentMonth, 9),
      title: 'PC買い替え',
      amount: 260_000,
      note: '開発用ノートPCの更新。',
    },
  ];

  const assetSeries: Record<string, Array<number | null>> = {
    'asset-bank': [820_000, 845_000, 870_000, 910_000, 960_000, 1_020_000, null],
    'asset-paypay': [12_000, 18_000, 15_000, 22_000, 17_000, 19_000, null],
    'asset-card': [-120_000, -140_000, -110_000, -130_000, -125_000, -98_000, null],
    'asset-nisa': [420_000, 480_000, 530_000, 580_000, 660_000, 720_000, null],
    'asset-taxable': [160_000, 190_000, 210_000, 250_000, 285_000, 330_000, null],
    'asset-legacy': [90_000, 105_000, 120_000, null, null, null, null],
  };

  const incomeSeries: Record<string, Array<number | null>> = {
    'income-salary': [360_000, 360_000, 365_000, 365_000, 368_000, 368_000, 368_000],
    'income-side': [28_000, 15_000, 22_000, 18_000, 25_000, 20_000, 18_000],
  };

  const investmentSeries: Record<string, Array<number | null>> = {
    'target-world': [40_000, 42_000, 45_000, 47_000, 50_000, 52_000, null],
    'target-sp500': [24_000, 25_000, 27_000, 28_000, 30_000, 31_000, null],
    'target-bonds': [16_000, 17_000, 18_000, 18_000, 20_000, 21_000, null],
  };

  const monthlyRecords = months.map((month, index) => {
    const record = createRecord(month);
    record.confirmed = confirmedMonths.has(month);
    record.confirmedAt = record.confirmed ? `${month}-28T09:00:00.000Z` : null;

    Object.entries(assetSeries).forEach(([assetId, series]) => {
      record.assetValues[assetId] = series[index] ?? null;
    });

    Object.entries(incomeSeries).forEach(([incomeId, series]) => {
      record.incomeValues[incomeId] = series[index] ?? null;
    });

    Object.entries(investmentSeries).forEach(([targetId, series]) => {
      record.investmentAmounts[targetId] = series[index] ?? null;
    });

    if (month === months[1]) {
      record.expenseOverride = 210_000;
    }

    if (month === months[2]) {
      record.expenseOverride = 218_000;
    }

    return record;
  });

  return {
    auth: {
      loggedIn: false,
    },
    user: {
      id: 'user-demo-001',
      name: 'Demo User',
      email: 'demo@example.com',
    },
    months,
    assets,
    incomes,
    lifePlans,
    settingsHistory,
    monthlyRecords,
    toasts: [],
  };
}

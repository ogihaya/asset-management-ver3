export type MonthKey = `${number}-${string}`;
export type Money = number | null;
export type ToastTone = 'success' | 'info' | 'warning';

export interface VisibilityPeriod {
  from: MonthKey;
  to?: MonthKey;
}

export interface NameHistoryItem {
  from: MonthKey;
  name: string;
}

export interface AssetDefinition {
  id: string;
  periods: VisibilityPeriod[];
  nameHistory: NameHistoryItem[];
}

export interface IncomeDefinition {
  id: string;
  periods: VisibilityPeriod[];
  nameHistory: NameHistoryItem[];
}

export interface InvestmentTarget {
  id: string;
  name: string;
  ratio: number;
}

export interface SettingsRevision {
  effectiveFrom: MonthKey;
  emergencyFund: number;
  targets: InvestmentTarget[];
}

export interface LifePlanEvent {
  id: string;
  month: MonthKey;
  title: string;
  amount: number;
  note: string;
}

export interface MonthlyRecord {
  month: MonthKey;
  confirmed: boolean;
  confirmedAt: string | null;
  expenseOverride: number | null;
  assetValues: Record<string, Money>;
  incomeValues: Record<string, Money>;
  investmentAmounts: Record<string, Money>;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

export interface AppState {
  auth: {
    loggedIn: boolean;
  };
  user: UserProfile;
  months: MonthKey[];
  assets: AssetDefinition[];
  incomes: IncomeDefinition[];
  lifePlans: LifePlanEvent[];
  settingsHistory: SettingsRevision[];
  monthlyRecords: MonthlyRecord[];
  toasts: ToastMessage[];
}

export interface ListedItem {
  id: string;
  name: string;
  value: Money;
}

export interface AllocationResult {
  targetId: string;
  targetName: string;
  ratio: number;
  amount: number;
}

export interface ForecastSummary {
  monthlyIncome: number | null;
  monthlyExpense: number | null;
  sampleMonths: number;
}

export interface InvestmentComputation {
  available: boolean;
  reasons: string[];
  targetEvent: LifePlanEvent | null;
  monthsUntilEvent: number;
  cumulativeIncome: number;
  cumulativeExpense: number;
  surplusAssets: number;
  investableAmount: number;
  allocations: AllocationResult[];
}

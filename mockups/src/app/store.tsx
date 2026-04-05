import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getFirstUnconfirmedMonth, getLatestDataMonth, getSettingsForMonth } from '../lib/calculations';
import { addMonths, compareMonths } from '../lib/months';
import { createSeedState } from '../mock-data/seed';
import type { AppState, InvestmentTarget, LifePlanEvent, MonthKey, ToastMessage } from '../types';
import { uid } from '../lib/utils';

const STORAGE_KEY = 'asset-management-mockups-v1';

interface AppStoreValue {
  state: AppState;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  resetDemo: () => void;
  dismissToast: (id: string) => void;
  addAsset: (month: MonthKey, name: string) => boolean;
  updateAssetValue: (month: MonthKey, assetId: string, value: number | null) => void;
  editAsset: (month: MonthKey, assetId: string, name: string, value: number | null) => boolean;
  deleteAsset: (assetId: string) => void;
  restoreAsset: (assetId: string) => void;
  addIncome: (month: MonthKey, name: string) => boolean;
  updateIncomeValue: (month: MonthKey, incomeId: string, value: number | null) => void;
  editIncome: (month: MonthKey, incomeId: string, name: string, value: number | null) => boolean;
  deleteIncome: (incomeId: string) => void;
  updateInvestmentAmount: (month: MonthKey, targetId: string, value: number | null) => void;
  confirmMonth: (month: MonthKey, override: number | null) => boolean;
  saveEmergencyFund: (amount: number) => void;
  saveInvestmentTargets: (targets: InvestmentTarget[]) => void;
  addLifePlan: (payload: Omit<LifePlanEvent, 'id'>) => void;
  updateLifePlan: (id: string, payload: Omit<LifePlanEvent, 'id'>) => void;
  deleteLifePlan: (id: string) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function cloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

function upsertNameHistory(history: Array<{ from: MonthKey; name: string }>, month: MonthKey, name: string) {
  const exists = history.some(function (item) {
    return item.from === month;
  });
  const next = exists
    ? history.map(function (item) {
        return item.from === month ? { ...item, name } : item;
      })
    : history.concat([{ from: month, name }]);

  return next.sort(function (left, right) {
    return compareMonths(left.from, right.from);
  });
}

function withToast(state: AppState, tone: ToastMessage['tone'], title: string, description?: string): AppState {
  return {
    ...state,
    toasts: state.toasts.concat([{ id: uid('toast'), tone, title, description }]),
  };
}

function firstUnconfirmedOrLatest(state: AppState): MonthKey {
  return getFirstUnconfirmedMonth(state) || getLatestDataMonth(state);
}

function readPersistedState(): AppState {
  if (typeof window === 'undefined') {
    return createSeedState();
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('reset-demo') === '1') {
    window.localStorage.removeItem(STORAGE_KEY);
    params.delete('reset-demo');
    const query = params.toString();
    const nextUrl = window.location.pathname + (query ? '?' + query : '') + window.location.hash;
    window.history.replaceState({}, '', nextUrl);
    return createSeedState();
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    return createSeedState();
  }

  try {
    return JSON.parse(stored) as AppState;
  } catch {
    return createSeedState();
  }
}

function ensureTargetShape(state: AppState, effectiveFrom: MonthKey, targets: InvestmentTarget[]) {
  const allowed = new Set(
    targets.map(function (target) {
      return target.id;
    }),
  );

  state.monthlyRecords
    .filter(function (record) {
      return compareMonths(record.month, effectiveFrom) >= 0;
    })
    .forEach(function (record) {
      Object.keys(record.investmentAmounts).forEach(function (targetId) {
        if (allowed.has(targetId) === false) {
          delete record.investmentAmounts[targetId];
        }
      });

      targets.forEach(function (target) {
        if ((target.id in record.investmentAmounts) === false) {
          record.investmentAmounts[target.id] = null;
        }
      });
    });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(function () {
    return readPersistedState();
  });

  useEffect(
    function () {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    [state],
  );

  const pushToast = useCallback(function (tone: ToastMessage['tone'], title: string, description?: string) {
    setState(function (current) {
      return withToast(current, tone, title, description);
    });
  }, []);

  const login = useCallback(
    function (email: string, password: string) {
      if (email === 'demo@example.com' && password === 'Demo1234!') {
        setState(function (current) {
          return withToast({ ...current, auth: { loggedIn: true } }, 'success', 'デモログインに成功しました。');
        });
        return true;
      }

      pushToast('warning', 'ログインに失敗しました。', 'デモアカウントは demo@example.com / Demo1234! です。');
      return false;
    },
    [pushToast],
  );

  const logout = useCallback(function () {
    setState(function (current) {
      return withToast({ ...current, auth: { loggedIn: false } }, 'info', 'ログアウトしました。');
    });
  }, []);

  const resetDemo = useCallback(function () {
    const seeded = createSeedState();
    setState(withToast(seeded, 'info', 'デモデータを初期状態に戻しました。'));
  }, []);

  const dismissToast = useCallback(function (id: string) {
    setState(function (current) {
      return {
        ...current,
        toasts: current.toasts.filter(function (toast) {
          return toast.id !== id;
        }),
      };
    });
  }, []);

  const addAsset = useCallback(function (month: MonthKey, name: string) {
    let succeeded = false;
    setState(function (current) {
      const duplicate = current.assets.some(function (asset) {
        return asset.nameHistory[asset.nameHistory.length - 1]?.name === name;
      });
      if (duplicate) {
        return withToast(current, 'warning', '同じ資産名は追加できません。');
      }

      const next = cloneState(current);
      const id = uid('asset');
      next.assets.push({
        id,
        periods: [{ from: month }],
        nameHistory: [{ from: month, name }],
      });
      next.monthlyRecords
        .filter(function (record) {
          return compareMonths(record.month, month) >= 0;
        })
        .forEach(function (record) {
          record.assetValues[id] = null;
        });
      succeeded = true;
      return withToast(next, 'success', '資産を追加しました。');
    });
    return succeeded;
  }, []);

  const updateAssetValue = useCallback(function (month: MonthKey, assetId: string, value: number | null) {
    setState(function (current) {
      const next = cloneState(current);
      const record = next.monthlyRecords.find(function (item) {
        return item.month === month;
      });
      if (record) {
        record.assetValues[assetId] = value;
      }
      return next;
    });
  }, []);

  const editAsset = useCallback(function (month: MonthKey, assetId: string, name: string, value: number | null) {
    let succeeded = false;
    setState(function (current) {
      const duplicate = current.assets.some(function (asset) {
        return asset.id !== assetId && asset.nameHistory[asset.nameHistory.length - 1]?.name === name;
      });
      if (duplicate) {
        return withToast(current, 'warning', '同じ資産名は使用できません。');
      }

      const next = cloneState(current);
      const asset = next.assets.find(function (item) {
        return item.id === assetId;
      });
      const record = next.monthlyRecords.find(function (item) {
        return item.month === month;
      });
      if (asset && record) {
        asset.nameHistory = upsertNameHistory(asset.nameHistory, month, name);
        record.assetValues[assetId] = value;
        next.monthlyRecords
          .filter(function (item) {
            return item.confirmed === false && compareMonths(item.month, month) > 0;
          })
          .forEach(function (item) {
            if ((assetId in item.assetValues) === false) {
              item.assetValues[assetId] = null;
            }
          });
        succeeded = true;
      }
      return withToast(next, 'success', '資産情報を更新しました。');
    });
    return succeeded;
  }, []);

  const deleteAsset = useCallback(function (assetId: string) {
    setState(function (current) {
      const effectiveFrom = firstUnconfirmedOrLatest(current);
      const next = cloneState(current);
      const asset = next.assets.find(function (item) {
        return item.id === assetId;
      });
      if (!asset) {
        return current;
      }

      const periods = asset.periods.slice();
      const currentPeriod = periods[periods.length - 1];
      currentPeriod.to = addMonths(effectiveFrom, -1);
      asset.periods = periods;

      next.monthlyRecords
        .filter(function (record) {
          return compareMonths(record.month, effectiveFrom) >= 0;
        })
        .forEach(function (record) {
          delete record.assetValues[assetId];
        });

      return withToast(next, 'info', '資産を削除しました。次の未確定月から非表示になります。');
    });
  }, []);

  const restoreAsset = useCallback(function (assetId: string) {
    setState(function (current) {
      const effectiveFrom = firstUnconfirmedOrLatest(current);
      const next = cloneState(current);
      const asset = next.assets.find(function (item) {
        return item.id === assetId;
      });
      if (!asset) {
        return current;
      }

      asset.periods.push({ from: effectiveFrom });
      asset.periods.sort(function (left, right) {
        return compareMonths(left.from, right.from);
      });
      next.monthlyRecords
        .filter(function (record) {
          return compareMonths(record.month, effectiveFrom) >= 0;
        })
        .forEach(function (record) {
          if ((assetId in record.assetValues) === false) {
            record.assetValues[assetId] = null;
          }
        });

      return withToast(next, 'success', '削除済み資産を復活しました。');
    });
  }, []);

  const addIncome = useCallback(function (month: MonthKey, name: string) {
    let succeeded = false;
    setState(function (current) {
      const duplicate = current.incomes.some(function (income) {
        return income.nameHistory[income.nameHistory.length - 1]?.name === name;
      });
      if (duplicate) {
        return withToast(current, 'warning', '同じ収入名は追加できません。');
      }

      const next = cloneState(current);
      const id = uid('income');
      next.incomes.push({
        id,
        periods: [{ from: month }],
        nameHistory: [{ from: month, name }],
      });
      next.monthlyRecords
        .filter(function (record) {
          return compareMonths(record.month, month) >= 0;
        })
        .forEach(function (record) {
          record.incomeValues[id] = null;
        });
      succeeded = true;
      return withToast(next, 'success', '収入明細を追加しました。');
    });
    return succeeded;
  }, []);

  const updateIncomeValue = useCallback(function (month: MonthKey, incomeId: string, value: number | null) {
    setState(function (current) {
      const next = cloneState(current);
      const record = next.monthlyRecords.find(function (item) {
        return item.month === month;
      });
      if (record) {
        record.incomeValues[incomeId] = value;
      }
      return next;
    });
  }, []);

  const editIncome = useCallback(function (month: MonthKey, incomeId: string, name: string, value: number | null) {
    let succeeded = false;
    setState(function (current) {
      const duplicate = current.incomes.some(function (income) {
        return income.id !== incomeId && income.nameHistory[income.nameHistory.length - 1]?.name === name;
      });
      if (duplicate) {
        return withToast(current, 'warning', '同じ収入名は使用できません。');
      }

      const next = cloneState(current);
      const income = next.incomes.find(function (item) {
        return item.id === incomeId;
      });
      const record = next.monthlyRecords.find(function (item) {
        return item.month === month;
      });
      if (income && record) {
        income.nameHistory = upsertNameHistory(income.nameHistory, month, name);
        record.incomeValues[incomeId] = value;
        succeeded = true;
      }
      return withToast(next, 'success', '収入明細を更新しました。');
    });
    return succeeded;
  }, []);

  const deleteIncome = useCallback(function (incomeId: string) {
    setState(function (current) {
      const effectiveFrom = firstUnconfirmedOrLatest(current);
      const next = cloneState(current);
      const income = next.incomes.find(function (item) {
        return item.id === incomeId;
      });
      if (!income) {
        return current;
      }

      const periods = income.periods.slice();
      const currentPeriod = periods[periods.length - 1];
      currentPeriod.to = addMonths(effectiveFrom, -1);
      income.periods = periods;
      next.monthlyRecords
        .filter(function (record) {
          return compareMonths(record.month, effectiveFrom) >= 0;
        })
        .forEach(function (record) {
          delete record.incomeValues[incomeId];
        });

      return withToast(next, 'info', '収入明細を削除しました。');
    });
  }, []);

  const updateInvestmentAmount = useCallback(function (month: MonthKey, targetId: string, value: number | null) {
    setState(function (current) {
      const next = cloneState(current);
      const record = next.monthlyRecords.find(function (item) {
        return item.month === month;
      });
      if (record) {
        record.investmentAmounts[targetId] = value;
      }
      return next;
    });
  }, []);

  const confirmMonth = useCallback(function (month: MonthKey, override: number | null) {
    let succeeded = false;
    setState(function (current) {
      const firstUnconfirmed = getFirstUnconfirmedMonth(current);
      if (firstUnconfirmed && firstUnconfirmed !== month) {
        return withToast(current, 'warning', '古い未確定月から順に確定してください。');
      }

      const next = cloneState(current);
      const record = next.monthlyRecords.find(function (item) {
        return item.month === month;
      });
      if (!record) {
        return current;
      }

      record.expenseOverride = override;
      record.confirmed = true;
      record.confirmedAt = new Date().toISOString();
      succeeded = true;
      return withToast(next, 'success', month + ' を確定しました。');
    });
    return succeeded;
  }, []);

  const saveEmergencyFund = useCallback(function (amount: number) {
    setState(function (current) {
      const effectiveFrom = firstUnconfirmedOrLatest(current);
      const next = cloneState(current);
      const targets = getSettingsForMonth(next, effectiveFrom).targets;
      const index = next.settingsHistory.findIndex(function (item) {
        return item.effectiveFrom === effectiveFrom;
      });
      if (index >= 0) {
        next.settingsHistory[index].emergencyFund = amount;
      } else {
        next.settingsHistory.push({ effectiveFrom, emergencyFund: amount, targets });
      }
      next.settingsHistory.sort(function (left, right) {
        return compareMonths(left.effectiveFrom, right.effectiveFrom);
      });
      return withToast(next, 'success', '生活防衛資金を保存しました。');
    });
  }, []);

  const saveInvestmentTargets = useCallback(function (targets: InvestmentTarget[]) {
    setState(function (current) {
      const effectiveFrom = firstUnconfirmedOrLatest(current);
      const next = cloneState(current);
      const emergencyFund = getSettingsForMonth(next, effectiveFrom).emergencyFund;
      const index = next.settingsHistory.findIndex(function (item) {
        return item.effectiveFrom === effectiveFrom;
      });
      if (index >= 0) {
        next.settingsHistory[index].targets = targets;
      } else {
        next.settingsHistory.push({ effectiveFrom, emergencyFund, targets });
      }
      next.settingsHistory.sort(function (left, right) {
        return compareMonths(left.effectiveFrom, right.effectiveFrom);
      });
      ensureTargetShape(next, effectiveFrom, targets);
      return withToast(next, 'success', '投資先配分を保存しました。');
    });
  }, []);

  const addLifePlan = useCallback(function (payload: Omit<LifePlanEvent, 'id'>) {
    setState(function (current) {
      const next = cloneState(current);
      next.lifePlans = current.lifePlans
        .concat([{ ...payload, id: uid('life') }])
        .sort(function (left, right) {
          return compareMonths(left.month, right.month);
        });
      return withToast(next, 'success', 'ライフプランを追加しました。');
    });
  }, []);

  const updateLifePlan = useCallback(function (id: string, payload: Omit<LifePlanEvent, 'id'>) {
    setState(function (current) {
      const next = cloneState(current);
      next.lifePlans = current.lifePlans
        .map(function (plan) {
          return plan.id === id ? { ...payload, id } : plan;
        })
        .sort(function (left, right) {
          return compareMonths(left.month, right.month);
        });
      return withToast(next, 'success', 'ライフプランを更新しました。');
    });
  }, []);

  const deleteLifePlan = useCallback(function (id: string) {
    setState(function (current) {
      const next = cloneState(current);
      next.lifePlans = current.lifePlans.filter(function (plan) {
        return plan.id !== id;
      });
      return withToast(next, 'info', 'ライフプランを削除しました。');
    });
  }, []);

  const value = useMemo<AppStoreValue>(
    function () {
      return {
        state,
        login,
        logout,
        resetDemo,
        dismissToast,
        addAsset,
        updateAssetValue,
        editAsset,
        deleteAsset,
        restoreAsset,
        addIncome,
        updateIncomeValue,
        editIncome,
        deleteIncome,
        updateInvestmentAmount,
        confirmMonth,
        saveEmergencyFund,
        saveInvestmentTargets,
        addLifePlan,
        updateLifePlan,
        deleteLifePlan,
      };
    },
    [
      state,
      login,
      logout,
      resetDemo,
      dismissToast,
      addAsset,
      updateAssetValue,
      editAsset,
      deleteAsset,
      restoreAsset,
      addIncome,
      updateIncomeValue,
      editIncome,
      deleteIncome,
      updateInvestmentAmount,
      confirmMonth,
      saveEmergencyFund,
      saveInvestmentTargets,
      addLifePlan,
      updateLifePlan,
      deleteLifePlan,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const context = useContext(AppStoreContext);
  if (context === null) {
    throw new Error('useAppStore must be used within AppProvider');
  }
  return context;
}

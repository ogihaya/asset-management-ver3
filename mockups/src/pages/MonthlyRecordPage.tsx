import { Pencil, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AuthenticatedShell } from '../components/layout';
import { useAppStore } from '../app/store';
import {
  getConfirmability,
  getDeletedAssets,
  getExpenseEstimate,
  getFirstUnconfirmedMonth,
  getTargetsForMonth,
  getVisibleAssets,
  getVisibleIncomes,
} from '../lib/calculations';
import { formatMonthLabel, isPastDeadline } from '../lib/months';
import { formatCurrency, toNumber } from '../lib/utils';
import { Button, Card, ConfirmDialog, CurrencyHint, Field, Modal, Pill, TextInput } from '../components/ui';
import type { ListedItem, MonthKey } from '../types';

interface RowEditorState {
  id: string;
  name: string;
  value: string;
}

export function MonthlyRecordPage() {
  const {
    state,
    addAsset,
    addIncome,
    confirmMonth,
    deleteAsset,
    deleteIncome,
    editAsset,
    editIncome,
    restoreAsset,
    updateAssetValue,
    updateIncomeValue,
    updateInvestmentAmount,
  } = useAppStore();

  const initialMonth = getFirstUnconfirmedMonth(state) || state.months[0];
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(initialMonth);
  const [assetAddOpen, setAssetAddOpen] = useState(false);
  const [incomeAddOpen, setIncomeAddOpen] = useState(false);
  const [assetNameDraft, setAssetNameDraft] = useState('');
  const [incomeNameDraft, setIncomeNameDraft] = useState('');
  const [assetEditState, setAssetEditState] = useState<RowEditorState | null>(null);
  const [incomeEditState, setIncomeEditState] = useState<RowEditorState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState('');
  const [deleteState, setDeleteState] = useState<null | { kind: 'asset' | 'income'; id: string; label: string }>(null);

  useEffect(() => {
    setSelectedMonth(initialMonth);
  }, [initialMonth]);

  const record = state.monthlyRecords.find((item) => item.month === selectedMonth);
  const assets = useMemo(() => getVisibleAssets(state, selectedMonth), [selectedMonth, state]);
  const deletedAssets = useMemo(() => getDeletedAssets(state, selectedMonth), [selectedMonth, state]);
  const incomes = useMemo(() => getVisibleIncomes(state, selectedMonth), [selectedMonth, state]);
  const targets = useMemo(() => getTargetsForMonth(state, selectedMonth), [selectedMonth, state]);
  const estimate = getExpenseEstimate(state, selectedMonth);
  const confirmability = getConfirmability(state, selectedMonth);
  const overdue = record ? record.confirmed === false && isPastDeadline(selectedMonth) : false;

  if (!record) {
    return null;
  }

  function openAssetEdit(item: ListedItem) {
    setAssetEditState({ id: item.id, name: item.name, value: item.value === null ? '' : String(item.value) });
  }

  function openIncomeEdit(item: ListedItem) {
    setIncomeEditState({ id: item.id, name: item.name, value: item.value === null ? '' : String(item.value) });
  }

  function submitAssetAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = assetNameDraft.trim();
    if (!name) {
      return;
    }
    const ok = addAsset(selectedMonth, name);
    if (ok) {
      setAssetAddOpen(false);
      setAssetNameDraft('');
    }
  }

  function submitIncomeAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = incomeNameDraft.trim();
    if (!name) {
      return;
    }
    const ok = addIncome(selectedMonth, name);
    if (ok) {
      setIncomeAddOpen(false);
      setIncomeNameDraft('');
    }
  }

  function submitAssetEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assetEditState) {
      return;
    }
    const ok = editAsset(selectedMonth, assetEditState.id, assetEditState.name.trim(), toNumber(assetEditState.value));
    if (ok) {
      setAssetEditState(null);
    }
  }

  function submitIncomeEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!incomeEditState) {
      return;
    }
    const ok = editIncome(selectedMonth, incomeEditState.id, incomeEditState.name.trim(), toNumber(incomeEditState.value));
    if (ok) {
      setIncomeEditState(null);
    }
  }

  function openConfirmModal() {
    if (!record) {
      return;
    }
    setConfirmOverride(record.expenseOverride === null ? estimate === null ? '' : String(estimate) : String(record.expenseOverride));
    setConfirmOpen(true);
  }

  function submitConfirm() {
    const value = toNumber(confirmOverride);
    if (estimate === null && value === null) {
      return;
    }
    const ok = confirmMonth(selectedMonth, value);
    if (ok) {
      setConfirmOpen(false);
    }
  }

  const monthIndex = state.months.findIndex((item) => item === selectedMonth);
  const prevMonth = monthIndex > 0 ? state.months[monthIndex - 1] : null;
  const nextMonth = monthIndex < state.months.length - 1 ? state.months[monthIndex + 1] : null;

  return (
    <AuthenticatedShell
      title='月次記録'
      subtitle='資産、収入、当月投資額を入力し、支出推定を確認してから月次を確定します。確定後は編集できません。'
      stickyBottomAction={
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] text-ink/35'>Monthly Close</div>
            <div className='mt-1 text-sm font-semibold text-ink'>{formatMonthLabel(selectedMonth)} の記録を確定</div>
            {confirmability.canConfirm === false ? (
              <div className='mt-1 text-xs text-amber'>{confirmability.reason}</div>
            ) : (
              <div className='mt-1 text-xs text-ink/50'>支出推定を確認し、必要なら補正してから確定します。</div>
            )}
          </div>
          <Button className='w-full sm:w-auto' disabled={confirmability.canConfirm === false} onClick={openConfirmModal} type='button'>
            月次確定
          </Button>
        </div>
      }
    >
      {overdue ? (
        <div className='rounded-[28px] border border-amber/20 bg-amber/10 px-5 py-4 text-sm text-amber'>
          確定期限を過ぎた月です。対象月一覧とあわせて確認し、できるだけ早く確定してください。
        </div>
      ) : null}

      <Card title='表示対象月' description='古い未確定月から順番に確定する必要があります。'>
        <div className='mb-4 flex justify-center'>
          {record.confirmed ? <Pill tone='success'>確定済み</Pill> : <Pill tone='warning'>未確定</Pill>}
        </div>
        <div className='flex flex-wrap items-center justify-center gap-3'>
          <Button disabled={prevMonth === null} onClick={() => prevMonth && setSelectedMonth(prevMonth)} type='button' variant='secondary'>
            前月
          </Button>
          <div className='min-w-44 rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-white'>
            {formatMonthLabel(selectedMonth)}
          </div>
          <Button disabled={nextMonth === null} onClick={() => nextMonth && setSelectedMonth(nextMonth)} type='button' variant='secondary'>
            翌月
          </Button>
        </div>
      </Card>

      <section className='grid gap-6 xl:grid-cols-[1.1fr_0.9fr]'>
        <Card
          title='資産入力カード'
          description='資産は名称単位で管理し、追加後は翌月以降も入力対象として表示されます。'
          action={
            <Button type='button' variant='secondary' onClick={() => setAssetAddOpen(true)}>
              <Plus size={16} />
              追加
            </Button>
          }
        >
          <div className='space-y-3'>
            {assets.map((asset) => (
              <div key={asset.id} className='grid gap-3 rounded-[24px] border border-ink/10 bg-soft p-4 md:grid-cols-[1fr_220px_auto] md:items-center'>
                <div>
                  <div className='font-medium text-ink'>{asset.name}</div>
                  <CurrencyHint value={asset.value} />
                </div>
                <TextInput
                  disabled={record.confirmed}
                  inputMode='numeric'
                  placeholder='金額を入力'
                  value={asset.value === null ? '' : String(asset.value)}
                  onChange={(event) => updateAssetValue(selectedMonth, asset.id, toNumber(event.target.value))}
                />
                <Button type='button' variant='ghost' onClick={() => openAssetEdit(asset)} disabled={record.confirmed}>
                  <Pencil size={16} />
                </Button>
              </div>
            ))}
          </div>
          {deletedAssets.length > 0 ? (
            <div className='mt-6 rounded-[24px] bg-cloud/70 p-4'>
              <div className='text-sm font-semibold text-ink'>削除済み資産を復活</div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {deletedAssets.map((asset) => (
                  <Button key={asset.id} type='button' variant='secondary' onClick={() => restoreAsset(asset.id)}>
                    <RotateCcw size={14} />
                    {asset.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <div className='space-y-6'>
          <Card
            title='収入入力カード'
            description='収入名は翌月以降も再利用されます。'
            action={
              <Button type='button' variant='secondary' onClick={() => setIncomeAddOpen(true)}>
                <Plus size={16} />
                追加
              </Button>
            }
          >
            <div className='space-y-3'>
              {incomes.map((income) => (
                <div key={income.id} className='grid gap-3 rounded-[24px] border border-ink/10 bg-soft p-4 md:grid-cols-[1fr_220px_auto] md:items-center'>
                  <div>
                    <div className='font-medium text-ink'>{income.name}</div>
                    <CurrencyHint value={income.value} />
                  </div>
                  <TextInput
                    disabled={record.confirmed}
                    inputMode='numeric'
                    placeholder='金額を入力'
                    value={income.value === null ? '' : String(income.value)}
                    onChange={(event) => updateIncomeValue(selectedMonth, income.id, toNumber(event.target.value))}
                  />
                  <Button type='button' variant='ghost' onClick={() => openIncomeEdit(income)} disabled={record.confirmed}>
                    <Pencil size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card title='投資入力カード' description='投資先の定義変更は設定画面で行い、ここでは当月金額のみ入力します。'>
            <div className='space-y-3'>
              {targets.map((target) => (
                <div key={target.id} className='grid gap-3 rounded-[24px] border border-ink/10 bg-soft p-4 md:grid-cols-[1fr_220px] md:items-center'>
                  <div>
                    <div className='font-medium text-ink'>{target.name}</div>
                    <div className='text-xs text-ink/45'>配分比率 {target.ratio}%</div>
                  </div>
                  <TextInput
                    disabled={record.confirmed}
                    inputMode='numeric'
                    placeholder='当月投資額'
                    value={record.investmentAmounts[target.id] === null || record.investmentAmounts[target.id] === undefined ? '' : String(record.investmentAmounts[target.id])}
                    onChange={(event) => updateInvestmentAmount(selectedMonth, target.id, toNumber(event.target.value))}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <Modal
        open={assetAddOpen}
        onClose={() => setAssetAddOpen(false)}
        title='資産を追加'
        description='追加時は資産名のみを登録します。金額は一覧へ行追加後に入力します。'
      >
        <form className='space-y-4' onSubmit={submitAssetAdd}>
          <Field label='資産名'>
            <TextInput value={assetNameDraft} onChange={(event) => setAssetNameDraft(event.target.value)} />
          </Field>
          <div className='flex justify-end gap-3'>
            <Button type='button' variant='secondary' onClick={() => setAssetAddOpen(false)}>キャンセル</Button>
            <Button type='submit'>追加する</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={incomeAddOpen}
        onClose={() => setIncomeAddOpen(false)}
        title='収入明細を追加'
        description='追加時は収入名のみを登録します。金額は一覧へ行追加後に入力します。'
      >
        <form className='space-y-4' onSubmit={submitIncomeAdd}>
          <Field label='収入名'>
            <TextInput value={incomeNameDraft} onChange={(event) => setIncomeNameDraft(event.target.value)} />
          </Field>
          <div className='flex justify-end gap-3'>
            <Button type='button' variant='secondary' onClick={() => setIncomeAddOpen(false)}>キャンセル</Button>
            <Button type='submit'>追加する</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={assetEditState !== null}
        onClose={() => setAssetEditState(null)}
        title='資産を編集'
        description='未確定月では資産名と当月金額を編集できます。削除すると次の未確定月から非表示になります。'
      >
        <form className='space-y-4' onSubmit={submitAssetEdit}>
          <Field label='資産名'>
            <TextInput value={assetEditState ? assetEditState.name : ''} onChange={(event) => setAssetEditState((current) => current ? { ...current, name: event.target.value } : current)} />
          </Field>
          <Field label='当月金額'>
            <TextInput inputMode='numeric' value={assetEditState ? assetEditState.value : ''} onChange={(event) => setAssetEditState((current) => current ? { ...current, value: event.target.value } : current)} />
          </Field>
          <div className='flex justify-between gap-3'>
            <Button type='button' variant='danger' onClick={() => assetEditState && setDeleteState({ kind: 'asset', id: assetEditState.id, label: assetEditState.name })}>削除</Button>
            <div className='flex gap-3'>
              <Button type='button' variant='secondary' onClick={() => setAssetEditState(null)}>キャンセル</Button>
              <Button type='submit'>保存する</Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={incomeEditState !== null}
        onClose={() => setIncomeEditState(null)}
        title='収入明細を編集'
        description='未確定月では収入名と当月金額を編集できます。'
      >
        <form className='space-y-4' onSubmit={submitIncomeEdit}>
          <Field label='収入名'>
            <TextInput value={incomeEditState ? incomeEditState.name : ''} onChange={(event) => setIncomeEditState((current) => current ? { ...current, name: event.target.value } : current)} />
          </Field>
          <Field label='当月金額'>
            <TextInput inputMode='numeric' value={incomeEditState ? incomeEditState.value : ''} onChange={(event) => setIncomeEditState((current) => current ? { ...current, value: event.target.value } : current)} />
          </Field>
          <div className='flex justify-between gap-3'>
            <Button type='button' variant='danger' onClick={() => incomeEditState && setDeleteState({ kind: 'income', id: incomeEditState.id, label: incomeEditState.name })}>削除</Button>
            <div className='flex gap-3'>
              <Button type='button' variant='secondary' onClick={() => setIncomeEditState(null)}>キャンセル</Button>
              <Button type='submit'>保存する</Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title='月次確定を確認'
        description='支出自動推定値を確認し、必要であればここで補正してから確定します。'
        footer={
          <>
            <Button type='button' variant='secondary' onClick={() => setConfirmOpen(false)}>キャンセル</Button>
            <Button type='button' onClick={submitConfirm} disabled={estimate === null && toNumber(confirmOverride) === null}>確定する</Button>
          </>
        }
      >
        <div className='rounded-[24px] bg-soft p-4'>
          <div className='text-sm font-semibold text-ink'>支出自動推定値</div>
          <div className='mt-2 text-2xl font-semibold text-ink'>{estimate === null ? '計算不可' : formatCurrency(estimate)}</div>
          {estimate === null ? <div className='mt-2 text-sm text-amber'>初月など前月総資産が存在しないため、自動推定できません。必要なら手動で支出を入力してください。</div> : null}
        </div>
        <Field label='支出補正'>
          <TextInput inputMode='numeric' placeholder='補正後の支出' value={confirmOverride} onChange={(event) => setConfirmOverride(event.target.value)} />
        </Field>
        {confirmability.canConfirm === false ? <div className='rounded-[24px] bg-amber/10 p-4 text-sm text-amber'>{confirmability.reason}</div> : null}
      </Modal>

      <ConfirmDialog
        open={deleteState !== null}
        onClose={() => setDeleteState(null)}
        onConfirm={() => {
          if (!deleteState) {
            return;
          }
          if (deleteState.kind === 'asset') {
            deleteAsset(deleteState.id);
            setAssetEditState(null);
          } else {
            deleteIncome(deleteState.id);
            setIncomeEditState(null);
          }
          setDeleteState(null);
        }}
        title={deleteState ? deleteState.label + ' を削除' : '削除'}
        description='削除は確認済み履歴を残したまま、次の未確定月から表示対象を外す扱いです。'
      />
    </AuthenticatedShell>
  );
}

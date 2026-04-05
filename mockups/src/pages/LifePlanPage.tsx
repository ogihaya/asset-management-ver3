import { Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AuthenticatedShell } from '../components/layout';
import { useAppStore } from '../app/store';
import { compareMonths, formatMonthLabel } from '../lib/months';
import { formatCurrency, toNumber } from '../lib/utils';
import { Button, Card, ConfirmDialog, EmptyState, Field, Modal, TextInput } from '../components/ui';
import type { LifePlanEvent, MonthKey } from '../types';

interface LifePlanDraft {
  month: string;
  title: string;
  amount: string;
  note: string;
}

function toDraft(plan?: LifePlanEvent): LifePlanDraft {
  return {
    month: plan ? plan.month : '',
    title: plan ? plan.title : '',
    amount: plan ? String(plan.amount) : '',
    note: plan ? plan.note : '',
  };
}

export function LifePlanPage() {
  const { state, addLifePlan, updateLifePlan, deleteLifePlan } = useAppStore();
  const plans = useMemo(
    () => [...state.lifePlans].sort((left, right) => compareMonths(left.month, right.month)),
    [state.lifePlans],
  );
  const [draft, setDraft] = useState<LifePlanDraft>(toDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setDraft(toDraft());
    setOpen(true);
  }

  function openEdit(plan: LifePlanEvent) {
    setEditingId(plan.id);
    setDraft(toDraft(plan));
    setOpen(true);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = toNumber(draft.amount);
    if (draft.month.trim() === '' || draft.title.trim() === '' || amount === null) {
      return;
    }

    const payload = {
      month: draft.month as MonthKey,
      title: draft.title.trim(),
      amount,
      note: draft.note.trim(),
    };

    if (editingId) {
      updateLifePlan(editingId, payload);
    } else {
      addLifePlan(payload);
    }
    setOpen(false);
  }

  return (
    <AuthenticatedShell
      title='ライフプラン'
      subtitle='将来のイベントを年月、内容、金額、メモ単位で管理します。同じ年月に複数イベントを登録できます。'
      stickyBottomAction={
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] text-ink/35'>Life Plan</div>
            <div className='mt-1 text-sm font-semibold text-ink'>将来イベントを追加して投資計算に反映</div>
            <div className='mt-1 text-xs text-ink/50'>年月、内容、金額、メモを1件ずつ登録します。</div>
          </div>
          <Button className='w-full sm:w-auto' type='button' onClick={openCreate}>
            <Plus size={16} />
            ライフプランを追加
          </Button>
        </div>
      }
    >
      <Card title='イベント一覧' description='投資計算では、この一覧のイベントを将来支出として参照します。'>
        {plans.length === 0 ? (
          <EmptyState title='ライフプランがありません' description='追加ボタンから将来イベントを登録してください。' />
        ) : (
          <div className='space-y-3'>
            {plans.map((plan) => (
              <div key={plan.id} className='grid gap-3 rounded-[24px] border border-ink/10 bg-white p-4 shadow-sm md:grid-cols-[180px_1fr_160px_auto] md:items-start'>
                <div>
                  <div className='text-sm font-semibold text-ink'>{formatMonthLabel(plan.month)}</div>
                  <div className='mt-1 text-xs text-ink/45'>実行予定月</div>
                </div>
                <div>
                  <div className='text-base font-semibold text-ink'>{plan.title}</div>
                  <div className='mt-2 text-sm leading-6 text-ink/60'>{plan.note || 'メモなし'}</div>
                </div>
                <div>
                  <div className='text-base font-semibold text-ink'>{formatCurrency(plan.amount)}</div>
                  <div className='mt-1 text-xs text-ink/45'>想定金額</div>
                </div>
                <Button type='button' variant='ghost' onClick={() => openEdit(plan)}>
                  <Pencil size={16} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'ライフプランを編集' : 'ライフプランを追加'}
        description='年月、内容、金額、メモを入力します。削除は編集モーダルから行います。'
      >
        <form className='space-y-4' onSubmit={submit}>
          <Field label='年月'>
            <TextInput type='month' value={draft.month} onChange={(event) => setDraft((current) => ({ ...current, month: event.target.value }))} />
          </Field>
          <Field label='内容'>
            <TextInput value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </Field>
          <Field label='金額'>
            <TextInput inputMode='numeric' value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} />
          </Field>
          <Field label='メモ'>
            <textarea className='min-h-28 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/15' value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} />
          </Field>
          <div className='flex justify-between gap-3'>
            <div>
              {editingId ? (
                <Button type='button' variant='danger' onClick={() => setDeleteId(editingId)}>
                  削除
                </Button>
              ) : null}
            </div>
            <div className='flex gap-3'>
              <Button type='button' variant='secondary' onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button type='submit'>保存する</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteLifePlan(deleteId);
          }
          setDeleteId(null);
          setOpen(false);
        }}
        title='ライフプランを削除'
        description='このイベントを一覧から削除します。'
      />
    </AuthenticatedShell>
  );
}

import { Pencil, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AuthenticatedShell } from '../components/layout';
import { useAppStore } from '../app/store';
import { getNextSettingsEffectiveMonth, getSettingsForMonth } from '../lib/calculations';
import { formatMonthLabel } from '../lib/months';
import { formatCurrency, formatPercent, toNumber, uid } from '../lib/utils';
import { Button, Card, ConfirmDialog, Field, InfoList, Modal, Pill, TextInput } from '../components/ui';
import type { InvestmentTarget } from '../types';

interface TargetDraft {
  id: string | null;
  name: string;
  ratio: string;
}

export function SettingsPage() {
  const { state, saveEmergencyFund, saveInvestmentTargets } = useAppStore();
  const effectiveFrom = getNextSettingsEffectiveMonth(state) || state.months[state.months.length - 1];
  const settings = getSettingsForMonth(state, effectiveFrom);
  const [emergencyDraft, setEmergencyDraft] = useState(String(settings.emergencyFund));
  const [targetsDraft, setTargetsDraft] = useState<InvestmentTarget[]>(settings.targets);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetDraft, setTargetDraft] = useState<TargetDraft>({ id: null, name: '', ratio: '' });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    setEmergencyDraft(String(settings.emergencyFund));
    setTargetsDraft(settings.targets);
  }, [settings, effectiveFrom]);

  const totalRatio = useMemo(
    () => Number(targetsDraft.reduce((sum, target) => sum + target.ratio, 0).toFixed(2)),
    [targetsDraft],
  );

  function openCreateTarget() {
    setTargetDraft({ id: null, name: '', ratio: '' });
    setTargetModalOpen(true);
  }

  function openEditTarget(target: InvestmentTarget) {
    setTargetDraft({ id: target.id, name: target.name, ratio: String(target.ratio) });
    setTargetModalOpen(true);
  }

  function submitTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ratio = toNumber(targetDraft.ratio);
    if (targetDraft.name.trim() === '' || ratio === null) {
      return;
    }

    if (targetDraft.id) {
      setTargetsDraft((current) => current.map((target) => (target.id === targetDraft.id ? { ...target, name: targetDraft.name.trim(), ratio } : target)));
    } else {
      setTargetsDraft((current) => current.concat([{ id: uid('target'), name: targetDraft.name.trim(), ratio }]));
    }
    setTargetModalOpen(false);
  }

  return (
    <AuthenticatedShell
      title='設定'
      subtitle='生活防衛資金と投資先配分を管理します。変更は次の未確定月から反映されます。'
      actions={<Pill tone='success'>適用開始月: {formatMonthLabel(effectiveFrom)}</Pill>}
    >
      <section className='grid gap-6 xl:grid-cols-[0.95fr_1.05fr]'>
        <Card title='生活防衛資金' description='投資に回さず、常に手元に残しておく現金の金額です。'>
          <div className='space-y-6'>
            <InfoList rows={[{ label: '現在の設定', value: formatCurrency(settings.emergencyFund), emphasize: true }]} />
            <Field label='防衛資金額 (円)' hint='次の未確定月から反映'>
              <TextInput inputMode='numeric' value={emergencyDraft} onChange={(event) => setEmergencyDraft(event.target.value)} />
            </Field>
            <div className='flex justify-end'>
              <Button type='button' onClick={() => {
                const amount = toNumber(emergencyDraft);
                if (amount !== null) {
                  saveEmergencyFund(amount);
                }
              }}>
                保存する
              </Button>
            </div>
          </div>
        </Card>

        <Card
          title='投資先配分比率'
          description='投資先の追加・編集・削除はこの画面だけで行います。比率合計は100.00%が必須です。'
          action={
            <Button type='button' variant='secondary' onClick={openCreateTarget}>
              <Plus size={16} />
              追加
            </Button>
          }
        >
          <div className='space-y-3'>
            {targetsDraft.map((target) => (
              <div key={target.id} className='grid gap-3 rounded-[24px] border border-ink/10 bg-soft p-4 md:grid-cols-[1fr_140px_auto] md:items-center'>
                <div>
                  <div className='font-medium text-ink'>{target.name}</div>
                  <div className='mt-1 text-xs text-ink/45'>配分比率は月次記録の投資先一覧にも反映されます。</div>
                </div>
                <div className='text-right text-base font-semibold text-ink'>{formatPercent(target.ratio)}</div>
                <Button type='button' variant='ghost' onClick={() => openEditTarget(target)}>
                  <Pencil size={16} />
                </Button>
              </div>
            ))}
          </div>
          <div className={totalRatio === 100 ? 'mt-5 rounded-[24px] bg-pine/10 px-4 py-4 text-sm text-pine' : 'mt-5 rounded-[24px] bg-amber/10 px-4 py-4 text-sm text-amber'}>
            合計比率: {totalRatio.toFixed(2)}%
          </div>
          <div className='mt-5 flex justify-end'>
            <Button type='button' disabled={totalRatio !== 100} onClick={() => saveInvestmentTargets(targetsDraft)}>
              保存する
            </Button>
          </div>
        </Card>
      </section>

      <Modal
        open={targetModalOpen}
        onClose={() => setTargetModalOpen(false)}
        title={targetDraft.id ? '投資先を編集' : '投資先を追加'}
        description='投資先名と比率を入力します。削除は編集モーダルから行います。'
      >
        <form className='space-y-4' onSubmit={submitTarget}>
          <Field label='投資先名'>
            <TextInput value={targetDraft.name} onChange={(event) => setTargetDraft((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label='比率 (%)'>
            <TextInput inputMode='numeric' value={targetDraft.ratio} onChange={(event) => setTargetDraft((current) => ({ ...current, ratio: event.target.value }))} />
          </Field>
          <div className='flex justify-between gap-3'>
            <div>
              {targetDraft.id ? <Button type='button' variant='danger' onClick={() => setDeleteTargetId(targetDraft.id)}>削除</Button> : null}
            </div>
            <div className='flex gap-3'>
              <Button type='button' variant='secondary' onClick={() => setTargetModalOpen(false)}>キャンセル</Button>
              <Button type='submit'>反映する</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) {
            setTargetsDraft((current) => current.filter((target) => target.id !== deleteTargetId));
          }
          setDeleteTargetId(null);
          setTargetModalOpen(false);
        }}
        title='投資先を削除'
        description='この投資先は次の未確定月から月次記録対象から外れます。'
      />
    </AuthenticatedShell>
  );
}

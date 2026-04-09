import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AuthenticatedShell } from '../components/layout';
import { useAppStore } from '../app/store';
import { getForecastSummary, getNextSettingsEffectiveMonth, getSettingsForMonth } from '../lib/calculations';
import { formatMonthLabel } from '../lib/months';
import { formatCurrency, formatPercent, toNumber, uid } from '../lib/utils';
import { Button, Card, Field, InfoList, Modal, Pill, TextInput } from '../components/ui';
import type { InvestmentTarget } from '../types';

interface TargetEditorRow {
  id: string;
  name: string;
  ratio: string;
}

function toEditorRows(targets: InvestmentTarget[]): TargetEditorRow[] {
  return targets.map(function (target) {
    return {
      id: target.id,
      name: target.name,
      ratio: target.ratio.toFixed(2),
    };
  });
}

export function SettingsPage() {
  const { state, saveEmergencyFund, saveInvestmentTargets } = useAppStore();
  const effectiveFrom = getNextSettingsEffectiveMonth(state) || state.months[state.months.length - 1];
  const settings = getSettingsForMonth(state, effectiveFrom);
  const forecast = getForecastSummary(state, effectiveFrom);
  const [emergencyDraft, setEmergencyDraft] = useState(String(settings.emergencyFund));
  const [targetsModalOpen, setTargetsModalOpen] = useState(false);
  const [targetRows, setTargetRows] = useState<TargetEditorRow[]>(toEditorRows(settings.targets));

  useEffect(() => {
    setEmergencyDraft(String(settings.emergencyFund));
    setTargetRows(toEditorRows(settings.targets));
  }, [settings, effectiveFrom]);

  const targetValidation = useMemo(
    function () {
      const normalized = targetRows.map(function (row) {
        return {
          ...row,
          trimmedName: row.name.trim(),
          numericRatio: toNumber(row.ratio),
        };
      });
      const names = normalized.map(function (row) {
        return row.trimmedName;
      });
      const duplicateNames = new Set(
        names.filter(function (name, index) {
          return name !== '' && names.indexOf(name) !== index;
        }),
      );
      const totalRatio = Number(
        normalized
          .reduce(function (sum, row) {
            return sum + (row.numericRatio ?? 0);
          }, 0)
          .toFixed(2),
      );
      const remainingRatio = Number((100 - totalRatio).toFixed(2));
      const hasBlankName = normalized.some(function (row) {
        return row.trimmedName === '';
      });
      const hasInvalidRatio = normalized.some(function (row) {
        return row.numericRatio === null || row.numericRatio < 0;
      });

      return {
        totalRatio,
        remainingRatio,
        duplicateNames,
        hasBlankName,
        hasInvalidRatio,
        canSave:
          normalized.length > 0 &&
          hasBlankName === false &&
          hasInvalidRatio === false &&
          duplicateNames.size === 0 &&
          totalRatio === 100,
      };
    },
    [targetRows],
  );

  function openTargetsEditor() {
    setTargetRows(toEditorRows(settings.targets));
    setTargetsModalOpen(true);
  }

  function updateTargetRow(id: string, patch: Partial<TargetEditorRow>) {
    setTargetRows(function (current) {
      return current.map(function (row) {
        return row.id === id ? { ...row, ...patch } : row;
      });
    });
  }

  function addTargetRow() {
    const suggestedRatio = targetValidation.remainingRatio > 0 ? targetValidation.remainingRatio.toFixed(2) : '';
    setTargetRows(function (current) {
      return current.concat([{ id: uid('target'), name: '', ratio: suggestedRatio }]);
    });
  }

  function removeTargetRow(id: string) {
    setTargetRows(function (current) {
      return current.filter(function (row) {
        return row.id !== id;
      });
    });
  }

  function submitTargets() {
    if (targetValidation.canSave === false) {
      return;
    }

    saveInvestmentTargets(
      targetRows.map(function (row) {
        return {
          id: row.id,
          name: row.name.trim(),
          ratio: Number((toNumber(row.ratio) ?? 0).toFixed(2)),
        };
      }),
    );
    setTargetsModalOpen(false);
  }

  return (
    <AuthenticatedShell
      title='設定'
      subtitle='生活防衛資金と投資先配分を管理し、投資計算に使う将来収支予測の前提を確認します。変更は次の未確定月から反映されます。'
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
              <Button
                type='button'
                onClick={() => {
                  const amount = toNumber(emergencyDraft);
                  if (amount !== null) {
                    saveEmergencyFund(amount);
                  }
                }}
              >
                保存する
              </Button>
            </div>
          </div>
        </Card>

        <Card
          title='投資先配分比率'
          description='投資先の追加・編集・削除は一覧一括編集モーダルで行います。比率合計は100.00%が必須です。'
          action={
            <Button type='button' variant='secondary' onClick={openTargetsEditor}>
              <Plus size={16} />
              一覧編集
            </Button>
          }
        >
          <div className='space-y-3'>
            {settings.targets.map((target) => (
              <div key={target.id} className='grid gap-3 rounded-[24px] border border-ink/10 bg-soft p-4 md:grid-cols-[1fr_140px_auto] md:items-center'>
                <div>
                  <div className='font-medium text-ink'>{target.name}</div>
                  <div className='mt-1 text-xs text-ink/45'>配分変更は次の未確定月から月次記録と投資配分に反映されます。</div>
                </div>
                <div className='text-right text-base font-semibold text-ink'>{formatPercent(target.ratio)}</div>
                <Button type='button' variant='ghost' onClick={openTargetsEditor}>
                  <Pencil size={16} />
                </Button>
              </div>
            ))}
          </div>
          <div className={settings.targets.reduce((sum, target) => sum + target.ratio, 0) === 100 ? 'mt-5 rounded-[24px] bg-pine/10 px-4 py-4 text-sm text-pine' : 'mt-5 rounded-[24px] bg-amber/10 px-4 py-4 text-sm text-amber'}>
            合計比率: {settings.targets.reduce((sum, target) => sum + target.ratio, 0).toFixed(2)}%
          </div>
        </Card>
      </section>

      <Card
        title='将来収支予測'
        description='投資計算では、確定済み月の直近6か月平均から将来の月次収入と月次支出を自動予測します。'
      >
        <div className='grid gap-6 lg:grid-cols-[0.9fr_1.1fr]'>
          <div className='rounded-[24px] bg-soft p-5'>
            <InfoList
              rows={[
                {
                  label: '予測月次収入',
                  value: forecast.monthlyIncome === null ? '算出不可' : formatCurrency(forecast.monthlyIncome),
                  emphasize: true,
                },
                {
                  label: '予測月次支出',
                  value: forecast.monthlyExpense === null ? '算出不可' : formatCurrency(forecast.monthlyExpense),
                  emphasize: true,
                },
                { label: '計算対象月数', value: `${forecast.sampleMonths}か月` },
                { label: '予測方式', value: '確定済み直近6か月平均' },
              ]}
            />
          </div>
          <div className='rounded-[24px] bg-cloud/55 p-5 text-sm leading-7 text-ink/65'>
            <div className='font-semibold text-ink'>予測ルール</div>
            <div className='mt-3'>
              収入予測は、確定済み月の収入実績を直近6か月分まで平均して算出します。賞与や臨時収入も通常収入として平均に含みます。
            </div>
            <div className='mt-3'>
              支出予測は、確定済み月の支出実績を直近6か月分まで平均して算出します。将来の大きな支出はライフプランイベントとして別に累積支出へ加算します。
            </div>
            <div className='mt-3'>
              確定済み月が6か月未満の場合は、存在する確定済み月だけで平均します。将来予測の手動入力や補正は行いません。
            </div>
          </div>
        </div>
      </Card>

      <Modal
        open={targetsModalOpen}
        onClose={() => setTargetsModalOpen(false)}
        title='投資先配分を一覧編集'
        description='投資先の追加・編集・削除をまとめて行い、合計比率が100.00%になった状態で保存します。'
        className='max-w-4xl'
      >
        <div className='space-y-4'>
          <div className='grid gap-3 rounded-[24px] bg-cloud/55 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink/45 md:grid-cols-[1.2fr_180px_80px]'>
            <div>投資先名</div>
            <div>比率 (%)</div>
            <div className='text-right'>操作</div>
          </div>
          <div className='space-y-3'>
            {targetRows.map((row) => {
              const duplicate = targetValidation.duplicateNames.has(row.name.trim());
              return (
                <div key={row.id} className='grid gap-3 rounded-[24px] border border-ink/10 bg-soft p-4 md:grid-cols-[1.2fr_180px_80px] md:items-start'>
                  <div>
                    <TextInput
                      placeholder='投資先名'
                      value={row.name}
                      onChange={(event) => updateTargetRow(row.id, { name: event.target.value })}
                    />
                    {duplicate ? <div className='mt-2 text-xs text-amber'>同じ投資先名は使用できません。</div> : null}
                  </div>
                  <div>
                    <TextInput
                      inputMode='numeric'
                      placeholder='比率'
                      value={row.ratio}
                      onChange={(event) => updateTargetRow(row.id, { ratio: event.target.value })}
                    />
                  </div>
                  <div className='flex justify-end'>
                    <Button type='button' variant='ghost' onClick={() => removeTargetRow(row.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-white p-4'>
            <div className='flex flex-wrap items-center gap-3 text-sm'>
              <Pill tone={targetValidation.totalRatio === 100 ? 'success' : 'warning'}>
                合計比率: {targetValidation.totalRatio.toFixed(2)}%
              </Pill>
              <Pill tone={targetValidation.remainingRatio === 0 ? 'success' : 'warning'}>
                残り比率: {targetValidation.remainingRatio.toFixed(2)}%
              </Pill>
            </div>
            <Button type='button' variant='secondary' onClick={addTargetRow}>
              <Plus size={16} />
              行を追加
            </Button>
          </div>

          {targetValidation.hasBlankName ? (
            <div className='rounded-[20px] bg-amber/10 px-4 py-3 text-sm text-amber'>投資先名が空欄の行があります。</div>
          ) : null}
          {targetValidation.hasInvalidRatio ? (
            <div className='rounded-[20px] bg-amber/10 px-4 py-3 text-sm text-amber'>比率には0以上の数値を入力してください。</div>
          ) : null}
          {targetValidation.totalRatio !== 100 ? (
            <div className='rounded-[20px] bg-amber/10 px-4 py-3 text-sm text-amber'>合計比率を100.00%に合わせると保存できます。</div>
          ) : null}

          <div className='flex justify-end gap-3'>
            <Button type='button' variant='secondary' onClick={() => setTargetsModalOpen(false)}>
              キャンセル
            </Button>
            <Button type='button' disabled={targetValidation.canSave === false} onClick={submitTargets}>
              この内容で保存
            </Button>
          </div>
        </div>
      </Modal>
    </AuthenticatedShell>
  );
}

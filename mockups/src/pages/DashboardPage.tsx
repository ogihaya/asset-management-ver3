import { useMemo, useState } from 'react';
import { AuthenticatedShell } from '../components/layout';
import { AllocationPieChart, AssetTrendChart } from '../components/charts';
import { Button, Card, EmptyState, InfoList, MetricCard, Modal, Pill } from '../components/ui';
import { useAppStore } from '../app/store';
import {
  buildTrendData,
  getForecastSummary,
  getNameForAsset,
  getInvestmentCompositionForMonth,
  getInvestmentComputation,
  getLatestConfirmedMonth,
  getSettingsForMonth,
  getTotalAssetsForMonth,
  getTotalIncomeForMonth,
  getTotalInvestmentValuationForMonth,
  getResolvedExpense,
  getVisibleAssets,
  hasTrendDataForSubject,
  isAssetVisibleInMonth,
} from '../lib/calculations';
import { formatMonthLabel } from '../lib/months';
import { formatCurrency, formatPercent } from '../lib/utils';

function formatDeltaPoint(value: number | null) {
  if (value === null) {
    return '--';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}pt`;
}

function getDeltaTone(value: number | null): 'neutral' | 'success' | 'warning' {
  if (value === null) {
    return 'neutral';
  }

  if (Math.abs(value) < 0.01) {
    return 'success';
  }

  if (value > 0) {
    return 'warning';
  }

  return 'neutral';
}

function getDeltaLabel(value: number | null) {
  if (value === null) {
    return '評価額未入力';
  }

  if (Math.abs(value) < 0.01) {
    return '理想通り';
  }

  return value > 0 ? '理想より高い' : '理想より低い';
}

export function DashboardPage() {
  const { state } = useAppStore();
  const analysisMonth = getLatestConfirmedMonth(state);
  const [subject, setSubject] = useState('total-assets');
  const [range, setRange] = useState<'3' | '6' | '12' | 'all'>('6');
  const [assetListOpen, setAssetListOpen] = useState(false);

  const visibleAssets = useMemo(
    function () {
      return analysisMonth ? getVisibleAssets(state, analysisMonth) : [];
    },
    [analysisMonth, state],
  );
  const regularAssetsTotal = useMemo(
    function () {
      return visibleAssets.reduce(function (sum, asset) {
        return sum + (asset.value ?? 0);
      }, 0);
    },
    [visibleAssets],
  );
  const assetSummaryRows = useMemo(
    function () {
      if (!analysisMonth) {
        return [];
      }

      const totalAssets = getTotalAssetsForMonth(state, analysisMonth);

      return [...visibleAssets]
        .sort(function (left, right) {
          return Math.abs(right.value ?? 0) - Math.abs(left.value ?? 0);
        })
        .map(function (asset) {
          const ratio =
            asset.value === null || totalAssets === 0
              ? null
              : Number(((asset.value / totalAssets) * 100).toFixed(2));

          return {
            ...asset,
            ratio,
            isLiability: (asset.value ?? 0) < 0,
          };
        });
    },
    [analysisMonth, state, visibleAssets],
  );
  const topAssetSummaryRows = useMemo(
    function () {
      return assetSummaryRows.slice(0, 3);
    },
    [assetSummaryRows],
  );
  const settings = analysisMonth ? getSettingsForMonth(state, analysisMonth) : null;
  const investment = analysisMonth ? getInvestmentComputation(state, analysisMonth) : null;
  const forecast = analysisMonth ? getForecastSummary(state, analysisMonth) : null;
  const composition = analysisMonth ? getInvestmentCompositionForMonth(state, analysisMonth) : null;
  const rawData = buildTrendData(state, subject);
  const hasTrendData = hasTrendDataForSubject(state, subject);
  const graphData = useMemo(
    function () {
      if (range === 'all') {
        return rawData;
      }
      return rawData.slice(-Number(range));
    },
    [range, rawData],
  );
  const graphOptions = useMemo(
    function () {
      if (!analysisMonth || !settings) {
        return {
          activeAssets: [] as Array<{ id: string; label: string }>,
          historicalAssets: [] as Array<{ id: string; label: string }>,
          activeTargets: [] as Array<{ id: string; label: string }>,
          historicalTargets: [] as Array<{ id: string; label: string }>,
        };
      }

      const activeAssetIds = new Set(visibleAssets.map(function (asset) {
        return asset.id;
      }));
      const activeTargetIds = new Set(settings.targets.map(function (target) {
        return target.id;
      }));

      const activeAssets = visibleAssets.map(function (asset) {
        return { id: asset.id, label: asset.name };
      });
      const historicalAssets = state.assets
        .filter(function (asset) {
          return activeAssetIds.has(asset.id) === false && isAssetVisibleInMonth(asset, analysisMonth) === false;
        })
        .map(function (asset) {
          return {
            id: asset.id,
            label: `${getNameForAsset(asset, analysisMonth)} (履歴)`,
          };
        });

      const activeTargets = settings.targets.map(function (target) {
        return { id: target.id, label: target.name };
      });

      const historicalTargetMap = new Map<string, string>();
      state.settingsHistory.forEach(function (revision) {
        revision.targets.forEach(function (target) {
          if (activeTargetIds.has(target.id) === false) {
            historicalTargetMap.set(target.id, `${target.name} (履歴)`);
          }
        });
      });

      return {
        activeAssets,
        historicalAssets,
        activeTargets,
        historicalTargets: Array.from(historicalTargetMap.entries()).map(function ([id, label]) {
          return { id, label };
        }),
      };
    },
    [analysisMonth, settings, state.assets, state.settingsHistory, visibleAssets],
  );

  return (
    <AuthenticatedShell
      title='ダッシュボード'
      subtitle='最新の確定済み月を基準に、資産状況、将来収支、投資判断、投資構成を確認する画面です。'
      actions={
        <Pill tone={analysisMonth ? 'success' : 'warning'}>
          分析対象: {analysisMonth ? formatMonthLabel(analysisMonth) : '確定済み月なし'}
        </Pill>
      }
    >
      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <MetricCard
          label='総資産'
          value={analysisMonth ? formatCurrency(getTotalAssetsForMonth(state, analysisMonth)) : '--'}
          note={analysisMonth ? '通常資産合計と投資評価額合計の合計' : '確定済み月がありません'}
        />
        <MetricCard
          label='月次収入'
          value={analysisMonth ? formatCurrency(getTotalIncomeForMonth(state, analysisMonth)) : '--'}
          note={analysisMonth ? '最新確定月の明細合計' : '確定済み月がありません'}
        />
        <MetricCard
          label='推定/補正後支出'
          value={analysisMonth ? formatCurrency(getResolvedExpense(state, analysisMonth)) : '--'}
          note={analysisMonth ? '最新確定月の確定値' : '確定済み月がありません'}
        />
        <MetricCard
          label='投資可能額'
          value={analysisMonth && investment?.available ? formatCurrency(investment.investableAmount) : '--'}
          note={analysisMonth ? '全ライフイベント比較で最小となる金額' : '確定済み月がありません'}
        />
      </section>

      <section className='grid gap-6 lg:grid-cols-[1fr_1fr]'>
        <Card
          title='総資産サマリーカード'
          description='最新確定月の総資産と、その内訳を確認する領域です。総資産は通常資産合計と投資評価額合計の合計です。'
          action={analysisMonth ? <Pill>{formatMonthLabel(analysisMonth)}</Pill> : undefined}
        >
          {analysisMonth && settings ? (
            <div className='grid gap-6 lg:grid-cols-[0.92fr_1.08fr]'>
              <InfoList
                rows={[
                  { label: '総資産', value: formatCurrency(getTotalAssetsForMonth(state, analysisMonth)), emphasize: true },
                  { label: '通常資産合計', value: formatCurrency(regularAssetsTotal) },
                  { label: '投資評価額合計', value: formatCurrency(getTotalInvestmentValuationForMonth(state, analysisMonth)) },
                  { label: '収入', value: formatCurrency(getTotalIncomeForMonth(state, analysisMonth)) },
                  { label: '支出', value: formatCurrency(getResolvedExpense(state, analysisMonth)) },
                ]}
              />
              <div className='rounded-[24px] bg-cloud/60 p-5'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <div className='text-sm font-semibold text-ink'>通常資産一覧</div>
                    <div className='mt-1 text-xs text-ink/45'>総資産の内訳に占める影響が大きい通常資産の上位3件を表示しています。</div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Pill tone='neutral'>{topAssetSummaryRows.length} / {assetSummaryRows.length}件</Pill>
                    {assetSummaryRows.length > 3 ? (
                      <Button type='button' variant='ghost' onClick={() => setAssetListOpen(true)}>
                        すべて見る
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className='mt-4 grid gap-3'>
                  {topAssetSummaryRows.length > 0 ? (
                    topAssetSummaryRows.map((asset) => (
                      <div key={asset.id} className='rounded-[20px] bg-white/75 px-4 py-4 text-sm'>
                        <div className='flex items-start justify-between gap-4'>
                          <div className='min-w-0'>
                            <div className='flex items-center gap-2'>
                              <div className='truncate font-medium text-ink'>{asset.name}</div>
                              {asset.isLiability ? <Pill tone='warning'>負債</Pill> : null}
                            </div>
                            <div className='mt-1 text-xs text-ink/45'>
                              {asset.ratio === null ? '総資産内比率 --' : `総資産内比率 ${formatPercent(asset.ratio)}`}
                            </div>
                          </div>
                          <div className='shrink-0 text-right font-semibold text-ink'>{formatCurrency(asset.value)}</div>
                        </div>
                        {asset.ratio !== null ? (
                          <div className='mt-3 h-2 overflow-hidden rounded-full bg-ink/8'>
                            <div
                              className={asset.ratio >= 0 ? 'h-full rounded-full bg-pine/80' : 'h-full rounded-full bg-amber/80'}
                              style={{ width: `${Math.min(Math.abs(asset.ratio), 100)}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className='rounded-[20px] bg-white/75 px-4 py-4 text-sm text-ink/60'>
                      表示対象の通常資産はありません。
                    </div>
                  )}
                  {assetSummaryRows.length > 3 ? (
                    <div className='rounded-[20px] border border-dashed border-ink/15 bg-white/55 px-4 py-4 text-sm text-ink/60'>
                      残り {assetSummaryRows.length - 3} 件の通常資産があります。必要に応じて「すべて見る」で確認してください。
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title='最新確定月のサマリーはまだありません'
              description='ダッシュボードの数値は確定済み月のみを対象に表示します。まず月次記録を確定してください。'
            />
          )}
        </Card>

        <Card title='投資構成カード' description='最新確定月の投資評価額から実績構成比を算出し、理想配分との差を確認する領域です。'>
          {analysisMonth && composition ? (
            composition.totalValue > 0 ? (
              <div className='grid gap-6 xl:grid-cols-[0.9fr_1.1fr]'>
                <div>
                  <AllocationPieChart
                    data={composition.items.map(function (target) {
                      return {
                        name: target.name,
                        value: target.actualRatio ?? 0,
                      };
                    })}
                  />
                  <div className='mt-4 text-center text-xs text-ink/50'>
                    円グラフは {formatMonthLabel(analysisMonth)} の投資評価額構成比を表示しています。
                  </div>
                </div>

                <div className='grid gap-3'>
                  {composition.items.map((target) => (
                    <div key={target.id} className='rounded-[24px] bg-cloud/50 px-4 py-4 text-sm'>
                      <div className='flex items-start justify-between gap-4'>
                        <div>
                          <div className='font-medium text-ink'>{target.name}</div>
                          <div className='mt-1 text-xs text-ink/45'>評価額 {formatCurrency(target.value)}</div>
                        </div>
                        <Pill tone={getDeltaTone(target.deltaRatio)}>
                          {getDeltaLabel(target.deltaRatio)} {formatDeltaPoint(target.deltaRatio)}
                        </Pill>
                      </div>
                      <div className='mt-4 grid gap-3 sm:grid-cols-3'>
                        <div className='rounded-2xl bg-white/75 px-3 py-3'>
                          <div className='text-xs text-ink/45'>実績比率</div>
                          <div className='mt-1 font-semibold text-ink'>
                            {target.actualRatio === null ? '--' : formatPercent(target.actualRatio)}
                          </div>
                        </div>
                        <div className='rounded-2xl bg-white/75 px-3 py-3'>
                          <div className='text-xs text-ink/45'>理想比率</div>
                          <div className='mt-1 font-semibold text-ink'>{formatPercent(target.ratio)}</div>
                        </div>
                        <div className='rounded-2xl bg-white/75 px-3 py-3'>
                          <div className='text-xs text-ink/45'>差分</div>
                          <div className='mt-1 font-semibold text-ink'>{formatDeltaPoint(target.deltaRatio)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                title='投資構成比を表示できません'
                description='最新確定月の投資評価額が未入力のため、実績構成比を計算できません。'
              />
            )
          ) : (
            <EmptyState
              title='投資構成はまだ表示できません'
              description='最新確定月が存在すると、ここに実績構成比と理想配分との差分が表示されます。'
            />
          )}
        </Card>
      </section>

      <Card title='将来収支と投資判断カード' description='投資判断を主表示とし、将来収支予測はその判断材料として補助表示する領域です。'>
        {analysisMonth && investment && forecast ? (
          <div className='space-y-6'>
            <div className='rounded-[24px] bg-cloud/60 p-5'>
              {investment.available ? (
                <>
                  <div className='mb-3 text-sm font-semibold text-ink'>投資判断</div>
                  <InfoList
                    rows={[
                      { label: '投資可能額', value: formatCurrency(investment.investableAmount), emphasize: true },
                      { label: '累積収入', value: formatCurrency(investment.cumulativeIncome) },
                      { label: '累積支出', value: formatCurrency(investment.cumulativeExpense) },
                      { label: '余力資産', value: formatCurrency(investment.surplusAssets) },
                      { label: '生活防衛資金', value: formatCurrency(investment.emergencyFund) },
                      {
                        label: '制約イベント',
                        value: investment.targetEvent ? `${formatMonthLabel(investment.targetEvent.month)} / ${investment.targetEvent.title}` : '未設定',
                      },
                    ]}
                  />
                  <div className='mt-3 text-xs leading-5 text-ink/50'>
                    すべてのライフイベントまでの投資可能額を比較し、最も金額が低くなるイベントを基準に採用しています。配分額は最新確定月の保有状況を見て、不足が大きい投資先ほど優先して寄せています。
                  </div>
                  <div className='mt-5 rounded-[24px] bg-white/75 p-4'>
                    <div className='text-sm font-semibold text-ink'>配分結果</div>
                    <div className='mt-3 space-y-3'>
                      {investment.allocations.map((allocation) => (
                        <div key={allocation.targetId} className='rounded-[20px] bg-cloud/45 px-4 py-4 text-sm'>
                          <div className='flex items-start justify-between gap-4'>
                            <div>
                              <div className='font-medium text-ink'>{allocation.targetName}</div>
                              <div className='mt-1 text-xs text-ink/45'>理想比率 {formatPercent(allocation.ratio)}</div>
                            </div>
                            <div className='text-right'>
                              <div className='text-xs text-ink/45'>今回の配分額</div>
                              <div className='mt-1 font-semibold text-ink'>{allocation.amount === 0 ? '0円（今回は見送り）' : formatCurrency(allocation.amount)}</div>
                            </div>
                          </div>
                          <div className='mt-3 text-xs text-ink/50'>現在評価額 {formatCurrency(allocation.currentValuation)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='mt-5 rounded-[24px] bg-soft p-5'>
                    <div className='mb-3 text-sm font-semibold text-ink'>将来収支予測</div>
                    <InfoList
                      rows={[
                        {
                          label: '予測月次収入',
                          value: forecast.monthlyIncome === null ? '算出不可' : formatCurrency(forecast.monthlyIncome),
                        },
                        {
                          label: '予測月次支出',
                          value: forecast.monthlyExpense === null ? '算出不可' : formatCurrency(forecast.monthlyExpense),
                        },
                        { label: '平均対象月数', value: `${forecast.sampleMonths}か月` },
                      ]}
                    />
                    <div className='mt-3 text-xs leading-5 text-ink/50'>
                      確定済み月の直近6か月平均を使います。収入には賞与や臨時収入も含み、ライフプランイベントは通常支出と別に加算します。
                    </div>
                  </div>
                </>
              ) : (
                <div className='space-y-3 text-sm text-ink/65'>
                  <div className='font-semibold text-ink'>計算を実行できません</div>
                  <ul className='list-disc space-y-1 pl-5'>
                    {investment.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            title='将来収支と投資判断はまだ表示できません'
            description='最新確定月と投資計算の前提が揃うと、ここに予測値と投資判断が表示されます。'
          />
        )}
      </Card>

      <Card title='資産グラフカード' description='任意の対象を選び、期間を切り替えながら確定済み月のみの推移を確認します。'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex flex-wrap gap-3'>
            <select
              className='rounded-full border border-ink/10 bg-white px-4 py-2 text-sm text-ink outline-none'
              onChange={(event) => setSubject(event.target.value)}
              value={subject}
            >
              <option value='total-assets'>総資産</option>
              <option value='income'>収入</option>
              <option value='expense'>支出</option>
              {graphOptions.activeAssets.length > 0 ? (
                <optgroup label='通常資産'>
                  {graphOptions.activeAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {graphOptions.activeTargets.length > 0 ? (
                <optgroup label='投資先評価額'>
                  {graphOptions.activeTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {graphOptions.historicalAssets.length > 0 || graphOptions.historicalTargets.length > 0 ? (
                <optgroup label='履歴項目'>
                  {graphOptions.historicalAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.label}
                    </option>
                  ))}
                  {graphOptions.historicalTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            <div className='flex gap-2 overflow-x-auto pb-1'>
              {[
                ['3', '3か月'],
                ['6', '6か月'],
                ['12', '1年'],
                ['all', '全期間'],
              ].map((item) => (
                <button
                  key={item[0]}
                  className={range === item[0] ? 'rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white' : 'rounded-full border border-ink/10 bg-white px-4 py-2 text-sm text-ink/65'}
                  onClick={() => setRange(item[0] as '3' | '6' | '12' | 'all')}
                  type='button'
                >
                  {item[1]}
                </button>
              ))}
            </div>
          </div>
          <Pill tone='neutral'>初期表示期間: 6か月</Pill>
        </div>
        <div className='mt-6'>
          {hasTrendData ? (
            <AssetTrendChart data={graphData} />
          ) : (
            <EmptyState
              title={analysisMonth ? '選択中の対象はまだ表示できません' : '確定済みの月次記録がまだありません'}
              description={
                analysisMonth
                  ? 'この対象は確定済み月に表示できる値がまだありません。別の対象を選ぶか、月次記録を確定してください。'
                  : '折れ線グラフは確定済み月のみを表示します。月次記録を確定するとここに推移が表示されます。'
              }
            />
          )}
        </div>
      </Card>

      <Modal
        open={assetListOpen}
        onClose={() => setAssetListOpen(false)}
        title='通常資産一覧'
        description='最新確定月の通常資産を、評価額の絶対値が大きい順に一覧表示します。投資先はこの一覧に含めません。'
        className='max-w-2xl'
      >
        <div className='grid max-h-[60vh] gap-3 overflow-y-auto pr-1'>
          {assetSummaryRows.map((asset) => (
            <div key={asset.id} className='rounded-[20px] bg-cloud/45 px-4 py-4 text-sm'>
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    <div className='truncate font-medium text-ink'>{asset.name}</div>
                    {asset.isLiability ? <Pill tone='warning'>負債</Pill> : null}
                  </div>
                  <div className='mt-1 text-xs text-ink/45'>
                    {asset.ratio === null ? '総資産内比率 --' : `総資産内比率 ${formatPercent(asset.ratio)}`}
                  </div>
                </div>
                <div className='shrink-0 text-right font-semibold text-ink'>{formatCurrency(asset.value)}</div>
              </div>
              {asset.ratio !== null ? (
                <div className='mt-3 h-2 overflow-hidden rounded-full bg-ink/8'>
                  <div
                    className={asset.ratio >= 0 ? 'h-full rounded-full bg-pine/80' : 'h-full rounded-full bg-amber/80'}
                    style={{ width: `${Math.min(Math.abs(asset.ratio), 100)}%` }}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Modal>
    </AuthenticatedShell>
  );
}

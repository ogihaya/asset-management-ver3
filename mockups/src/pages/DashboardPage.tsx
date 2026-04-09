import { useMemo, useState } from 'react';
import { AuthenticatedShell } from '../components/layout';
import { AllocationPieChart, AssetTrendChart } from '../components/charts';
import { Card, EmptyState, InfoList, MetricCard, Pill } from '../components/ui';
import { useAppStore } from '../app/store';
import {
  buildTrendData,
  getForecastSummary,
  getInvestmentCompositionForMonth,
  getInvestmentComputation,
  getLatestConfirmedMonth,
  getSettingsForMonth,
  getTotalAssetsForMonth,
  getTotalIncomeForMonth,
  getTotalInvestmentValuationForMonth,
  getResolvedExpense,
  getVisibleAssets,
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

  const visibleAssets = useMemo(
    function () {
      return analysisMonth ? getVisibleAssets(state, analysisMonth) : [];
    },
    [analysisMonth, state],
  );
  const assetSummaryRows = useMemo(
    function () {
      if (!analysisMonth) {
        return [];
      }

      const totalAssets = getTotalAssetsForMonth(state, analysisMonth);

      return [...visibleAssets]
        .sort(function (left, right) {
          return (right.value ?? 0) - (left.value ?? 0);
        })
        .map(function (asset) {
          const ratio =
            asset.value === null || totalAssets === 0
              ? null
              : Number(((asset.value / totalAssets) * 100).toFixed(2));

          return {
            ...asset,
            ratio,
          };
        });
    },
    [analysisMonth, state, visibleAssets],
  );
  const settings = analysisMonth ? getSettingsForMonth(state, analysisMonth) : null;
  const investment = analysisMonth ? getInvestmentComputation(state, analysisMonth) : null;
  const forecast = analysisMonth ? getForecastSummary(state, analysisMonth) : null;
  const composition = analysisMonth ? getInvestmentCompositionForMonth(state, analysisMonth) : null;
  const rawData = buildTrendData(state, subject);
  const graphData = useMemo(
    function () {
      if (range === 'all') {
        return rawData;
      }
      return rawData.slice(-Number(range));
    },
    [range, rawData],
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
          note={analysisMonth ? '最新確定月の集計値' : '確定済み月がありません'}
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
          title='最新の資産サマリーカード'
          description='最新確定月の資産状況と、集計の内訳を確認する領域です。'
          action={analysisMonth ? <Pill>{formatMonthLabel(analysisMonth)}</Pill> : undefined}
        >
          {analysisMonth && settings ? (
            <div className='grid gap-6 lg:grid-cols-[0.92fr_1.08fr]'>
              <InfoList
                rows={[
                  { label: '総資産', value: formatCurrency(getTotalAssetsForMonth(state, analysisMonth)), emphasize: true },
                  { label: '収入', value: formatCurrency(getTotalIncomeForMonth(state, analysisMonth)) },
                  { label: '支出', value: formatCurrency(getResolvedExpense(state, analysisMonth)) },
                  { label: '投資評価額合計', value: formatCurrency(getTotalInvestmentValuationForMonth(state, analysisMonth)) },
                  { label: '生活防衛資金', value: formatCurrency(settings.emergencyFund) },
                ]}
              />
              <div className='rounded-[24px] bg-cloud/60 p-5'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='text-sm font-semibold text-ink'>通常資産一覧</div>
                  <Pill tone='neutral'>{assetSummaryRows.length}件</Pill>
                </div>
                <div className='mt-4 grid gap-3'>
                  {assetSummaryRows.map((asset) => (
                    <div key={asset.id} className='rounded-[20px] bg-white/75 px-4 py-4 text-sm'>
                      <div className='flex items-start justify-between gap-4'>
                        <div className='min-w-0'>
                          <div className='truncate font-medium text-ink'>{asset.name}</div>
                          <div className='mt-1 text-xs text-ink/45'>
                            {asset.ratio === null ? '総資産比率 --' : `総資産比率 ${formatPercent(asset.ratio)}`}
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

      <Card title='将来収支と投資判断カード' description='将来収支予測と、採用されたライフイベントを基準にした投資判断を確認する領域です。'>
        {analysisMonth && investment && forecast ? (
          <div className='grid gap-6 lg:grid-cols-[0.95fr_1.05fr]'>
            <div className='rounded-[24px] bg-soft p-5'>
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
                      {
                        label: '制約イベント',
                        value: investment.targetEvent ? `${investment.targetEvent.title} / ${formatMonthLabel(investment.targetEvent.month)}` : '未設定',
                      },
                    ]}
                  />
                  <div className='mt-3 text-xs leading-5 text-ink/50'>
                    すべてのライフイベントまでの投資可能額を比較し、最も金額が低くなるイベントを基準に採用しています。
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
              {visibleAssets.length > 0 ? (
                <optgroup label='通常資産'>
                  {visibleAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {composition?.items.length ? (
                <optgroup label='投資先評価額'>
                  {composition.items.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            <div className='flex flex-wrap gap-2'>
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
          {graphData.length > 0 ? (
            <AssetTrendChart data={graphData} />
          ) : (
            <EmptyState
              title='確定済みの月次記録がまだありません'
              description='折れ線グラフは確定済み月のみを表示します。月次記録を確定するとここに推移が表示されます。'
            />
          )}
        </div>
      </Card>
    </AuthenticatedShell>
  );
}

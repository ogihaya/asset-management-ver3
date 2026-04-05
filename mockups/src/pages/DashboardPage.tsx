import { useMemo, useState } from 'react';
import { AuthenticatedShell } from '../components/layout';
import { AllocationPieChart, AssetTrendChart } from '../components/charts';
import { Card, InfoList, MetricCard, Pill } from '../components/ui';
import { useAppStore } from '../app/store';
import {
  buildTrendData,
  getInvestmentComputation,
  getLatestDataMonth,
  getSettingsForMonth,
  getTotalAssetsForMonth,
  getTotalIncomeForMonth,
  getTotalInvestmentForMonth,
  getResolvedExpense,
  getVisibleAssets,
} from '../lib/calculations';
import { formatMonthLabel } from '../lib/months';
import { formatCurrency, formatPercent } from '../lib/utils';

export function DashboardPage() {
  const { state } = useAppStore();
  const analysisMonth = getLatestDataMonth(state);
  const [subject, setSubject] = useState('total-assets');
  const [range, setRange] = useState<'3' | '6' | '12' | 'all'>('6');

  const visibleAssets = getVisibleAssets(state, analysisMonth);
  const settings = getSettingsForMonth(state, analysisMonth);
  const investment = getInvestmentComputation(state, analysisMonth);
  const rawData = buildTrendData(state, subject);
  const graphData = useMemo(() => {
    if (range === 'all') {
      return rawData;
    }
    return rawData.slice(-Number(range));
  }, [range, rawData]);

  return (
    <AuthenticatedShell
      title='ダッシュボード'
      subtitle='直近の資産状況、月次収支、投資可能額、投資先配分をひとつの流れで確認するための画面です。'
      actions={<Pill tone='success'>分析対象: {formatMonthLabel(analysisMonth)}</Pill>}
    >
      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <MetricCard label='総資産' value={formatCurrency(getTotalAssetsForMonth(state, analysisMonth))} note='クレジットカード引落予定を含む' />
        <MetricCard label='月次収入' value={formatCurrency(getTotalIncomeForMonth(state, analysisMonth))} note='最新入力月の明細合計' />
        <MetricCard label='推定/補正後支出' value={formatCurrency(getResolvedExpense(state, analysisMonth))} note='月次確定モーダルで確認' />
        <MetricCard label='投資可能額' value={formatCurrency(investment.investableAmount)} note='最も近いライフイベントを基準に算出' />
      </section>

      <section className='grid gap-6 xl:grid-cols-[1.05fr_0.95fr]'>
        <Card
          title='最新の資産サマリーカード'
          description='総資産と月次収支の関係をコンパクトに確認する領域です。'
          action={<Pill>{formatMonthLabel(analysisMonth)}</Pill>}
        >
          <div className='grid gap-6 lg:grid-cols-[1fr_0.85fr]'>
            <InfoList
              rows={[
                { label: '総資産', value: formatCurrency(getTotalAssetsForMonth(state, analysisMonth)), emphasize: true },
                { label: '収入', value: formatCurrency(getTotalIncomeForMonth(state, analysisMonth)) },
                { label: '支出', value: formatCurrency(getResolvedExpense(state, analysisMonth)) },
                { label: '月次投資実績', value: formatCurrency(getTotalInvestmentForMonth(state, analysisMonth)) },
                { label: '生活防衛資金', value: formatCurrency(settings.emergencyFund) },
              ]}
            />
            <div className='rounded-[24px] bg-cloud/60 p-5'>
              <div className='text-sm font-semibold text-ink'>入力中の資産</div>
              <div className='mt-4 space-y-3'>
                {visibleAssets.slice(0, 4).map((asset) => (
                  <div key={asset.id} className='flex items-center justify-between gap-3 text-sm'>
                    <span className='text-ink/65'>{asset.name}</span>
                    <span className='font-medium text-ink'>{formatCurrency(asset.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title='投資の情報カード' description='投資可能額、配分、計算根拠をまとめて確認する領域です。'>
          <div className='grid gap-6 lg:grid-cols-[0.9fr_1.1fr]'>
            <div className='rounded-[24px] bg-soft p-5'>
              {investment.available ? (
                <InfoList
                  rows={[
                    { label: '投資可能額', value: formatCurrency(investment.investableAmount), emphasize: true },
                    { label: '累積収入', value: formatCurrency(investment.cumulativeIncome) },
                    { label: '累積支出', value: formatCurrency(investment.cumulativeExpense) },
                    { label: '余力資産', value: formatCurrency(investment.surplusAssets) },
                    {
                      label: '到達イベント',
                      value: investment.targetEvent ? investment.targetEvent.title + ' / ' + formatMonthLabel(investment.targetEvent.month) : '未設定',
                    },
                  ]}
                />
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
            <div>
              <AllocationPieChart data={settings.targets.map((target) => ({ name: target.name, value: target.ratio }))} />
              <div className='mt-4 grid gap-2'>
                {settings.targets.map((target) => (
                  <div key={target.id} className='flex items-center justify-between rounded-2xl bg-cloud/50 px-4 py-3 text-sm'>
                    <span className='text-ink/70'>{target.name}</span>
                    <span className='font-semibold text-ink'>{formatPercent(target.ratio)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <Card title='資産グラフカード' description='任意の対象を選び、期間を切り替えながら推移を確認します。'>
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
              {visibleAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
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
          <AssetTrendChart data={graphData} />
        </div>
      </Card>
    </AuthenticatedShell>
  );
}

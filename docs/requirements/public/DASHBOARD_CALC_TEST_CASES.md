# DASHBOARD_CALC_TEST_CASES

## 0. 位置づけ

本書は、ダッシュボード集計と投資判断ロジックの期待値を固定するためのテストケース集である。共通データセットは [MONTHLY_RULE_MATRIX.md](./MONTHLY_RULE_MATRIX.md) を参照する。

## 1. 計算ルールの固定

### 1.1 将来収支予測

- 対象月以前の確定済み月だけを使う。
- 対象月以前の確定済み月から新しい順に最大 6 か月を使う。
- 平均は四捨五入とし、`Math.round(sum / count)` を正とする。
- `monthly_income_yen` は収入合計の平均、`monthly_expense_yen` は確定支出の平均とする。

### 1.2 投資可能額

- `months_until_event = diffMonths(analysis_month, event_month) + 1`
- `cumulative_event_cost` は「採用候補イベント月までに発生するライフプラン金額の累積」とする。
- `surplus_assets = cumulative_income - cumulative_expense - emergency_fund`
- `investable_amount = max(0, floor(surplus_assets / months_until_event))`
- 複数イベントのうち最小の `investable_amount` を採用する。
- 同額なら早い年月のイベントを採用する。

### 1.3 計算不可理由の並び順

以下の順で理由を評価し、該当したものをその順番で列挙する。

1. ライフプラン未登録
2. 投資先配分未設定
3. 配分合計 100% 不一致
4. 将来収入を予測できない
5. 将来支出を予測できない

### 1.4 配分

- 基準は最新確定月の投資評価額とする。
- `post_total = current_total + investable_amount`
- 各投資先の理想評価額 `ideal_post_value = post_total * ratio / 100`
- 不足額 `shortfall = max(0, ideal_post_value - current_valuation)`
- 1 回目の配分は `floor(investable_amount * shortfall / total_shortfall)`
- 余り 1 円は不足額の大きい順、同額なら設定順で配る。
- `investable_amount <= 0` の場合は全投資先 `0` 円配分にする。

## 2. ベースケース

### 2.1 ベース入力

| 項目 | 値 |
| --- | --- |
| `analysis_month` | `2026-04` |
| 最新確定月の通常資産合計 | 1,430,000 |
| 最新確定月の投資評価額合計 | 1,200,000 |
| 生活防衛資金 | 240,000 |
| 配分 | 全世界 50.00 / 米国株式 30.00 / 先進国債券 20.00 |
| ライフプラン | `2026-07: 120,000`、`2026-12: 360,000` |

#### 最新確定月 `2026-04` の投資評価額

| 投資先 | 現在評価額 | 理想比率 |
| --- | --- | --- |
| 全世界株式 | 600,000 | 50.00 |
| 米国株式 | 420,000 | 30.00 |
| 先進国債券 | 180,000 | 20.00 |

#### 直近 6 か月の予測元

| 月 | 収入合計 | 確定支出 |
| --- | --- | --- |
| `2025-11` | 400,000 | 240,000 |
| `2025-12` | 500,000 | 250,000 |
| `2026-01` | 350,000 | 260,000 |
| `2026-02` | 350,000 | 250,000 |
| `2026-03` | 400,000 | 250,000 |
| `2026-04` | 400,000 | 250,000 |

### 2.2 ベース期待値

| 項目 | 期待値 |
| --- | --- |
| `forecast_monthly_income_yen` | 400,000 |
| `forecast_monthly_expense_yen` | 250,000 |
| `sample_months` | 6 |
| `kpis.total_assets_yen` | 2,630,000 |
| `kpis.monthly_income_yen` | 400,000 |
| `kpis.resolved_expense_yen` | 250,000 |
| `investment_composition.total_valuation_yen` | 1,200,000 |

## 3. Forecast ケース

| ケースID | 前提 | 期待結果 |
| --- | --- | --- |
| `FC-01` | ベースケース | `income=400,000` `expense=250,000` `sample_months=6` |
| `FC-02` | 確定済み月を `2026-01` 〜 `2026-04` の 4 か月だけに絞る | `income=375,000` `expense=253,000` `sample_months=4` |
| `FC-03` | 確定済み月が 0 件 | `income=null` `expense=null` `sample_months=0` |

## 4. 投資判断ケース

### 4.1 ベースケース

#### イベント比較

| イベント | 月数 | 累積イベント金額 | 累積収入 | 累積支出 | 余力資産 | 投資可能額 |
| --- | --- | --- | --- | --- | --- | --- |
| `2026-07 引っ越し初期費用` | 4 | 120,000 | 1,600,000 | 1,120,000 | 240,000 | 60,000 |
| `2026-12 ノートPC買い替え` | 9 | 480,000 | 3,600,000 | 2,730,000 | 630,000 | 70,000 |

#### 採用結果

| 項目 | 期待値 |
| --- | --- |
| 採用イベント | `2026-07 引っ越し初期費用` |
| `months_until_event` | 4 |
| `cumulative_income_yen` | 1,600,000 |
| `cumulative_expense_yen` | 1,120,000 |
| `surplus_assets_yen` | 240,000 |
| `investable_amount_yen` | 60,000 |

### 4.2 同額 tie break

前提を以下へ差し替える。

| イベント | 金額 |
| --- | --- |
| `2026-06 車検` | 180,000 |
| `2026-09 引っ越し` | 420,000 |

期待値は以下とする。

| 項目 | 期待値 |
| --- | --- |
| `2026-06` の投資可能額 | 10,000 |
| `2026-09` の投資可能額 | 10,000 |
| 採用イベント | `2026-06 車検` |

### 4.3 負値の切り上げ

前提を以下へ差し替える。

| 項目 | 値 |
| --- | --- |
| 生活防衛資金 | 900,000 |

期待値は以下とする。

| 項目 | 期待値 |
| --- | --- |
| ベースイベント比較の最小投資可能額 | 0 |
| 配分結果 | 全投資先 `0` 円 |

## 5. 配分ケース

### 5.1 ベースケースの配分

#### 中間値

| 投資先 | 現在評価額 | 投資後理想評価額 | 不足額 |
| --- | --- | --- | --- |
| 全世界株式 | 600,000 | 630,000 | 30,000 |
| 米国株式 | 420,000 | 378,000 | 0 |
| 先進国債券 | 180,000 | 252,000 | 72,000 |

#### 期待配分

| 投資先 | 配分額 |
| --- | --- |
| 全世界株式 | 17,647 |
| 米国株式 | 0 |
| 先進国債券 | 42,353 |

- 合計は必ず `60,000` 円になる。
- 余り 1 円は不足額が最も大きい `先進国債券` に配る。

### 5.2 0 円配分

| ケースID | 前提 | 期待値 |
| --- | --- | --- |
| `AL-02` | `investable_amount_yen=0` | すべての投資先を結果一覧に残したまま `0` 円 |

## 6. 計算不可理由ケース

| ケースID | 差し替え前提 | 期待理由 |
| --- | --- | --- |
| `IR-01` | ライフプラン一覧を空にする | `ライフプランが未登録です。` |
| `IR-02` | 投資先配分を空にする | `投資先配分が未設定です。` |
| `IR-03` | 配分を `45 / 35 / 15` にする | `投資先配分の合計比率が100%ではありません。` |
| `IR-04` | 確定済み月を 0 件にする | `確定済み月の収入実績がないため将来収入を予測できません。` と `確定済み月の支出実績がないため将来支出を予測できません。` |

- 理由の並び順は 1.3 の順とする。
- frontend は dashboard 本体に加えて `/settings` と `/life-plans` を併用し、同じ条件で理由表示を再現する。

## 7. ダッシュボード API への写像

| 内部計算値 | `/dashboard` フィールド |
| --- | --- |
| 最新確定月 | `analysis_month` |
| 通常資産合計 + 投資評価額合計 | `kpis.total_assets_yen` |
| 最新確定月の収入合計 | `kpis.monthly_income_yen` |
| 最新確定月の確定支出 | `kpis.resolved_expense_yen` |
| 予測月次収入 | `investment_decision.forecast_monthly_income_yen` |
| 予測月次支出 | `investment_decision.forecast_monthly_expense_yen` |
| 平均対象月数 | `investment_decision.sample_months` |
| 採用イベント | `investment_decision.adopted_event` |
| 配分結果 | `investment_decision.allocations` |

### 7.1 ベースケースの期待レスポンス断片

```json
{
  "data": {
    "analysis_month": "2026-04",
    "kpis": {
      "total_assets_yen": 2630000,
      "monthly_income_yen": 400000,
      "resolved_expense_yen": 250000,
      "investable_amount_yen": 60000
    },
    "asset_summary": {
      "regular_assets_total_yen": 1430000
    },
    "investment_composition": {
      "total_valuation_yen": 1200000
    },
    "investment_decision": {
      "forecast_monthly_income_yen": 400000,
      "forecast_monthly_expense_yen": 250000,
      "sample_months": 6,
      "investable_amount_yen": 60000,
      "cumulative_income_yen": 1600000,
      "cumulative_expense_yen": 1120000,
      "surplus_assets_yen": 240000,
      "emergency_fund_yen": 240000,
      "adopted_event": {
        "month": "2026-07",
        "title": "引っ越し初期費用"
      }
    }
  }
}
```

### 7.2 trend の期待値

`GET /dashboard/trend?subject_type=total_assets&period=6m` の `points` は以下と一致する。

| 月 | 値 |
| --- | --- |
| `2025-11` | 2,200,000 |
| `2025-12` | 2,310,000 |
| `2026-01` | 2,390,000 |
| `2026-02` | 2,460,000 |
| `2026-03` | 2,550,000 |
| `2026-04` | 2,630,000 |

- trend は確定済み月のみ返す。
- データが無い subject を選んでも他 subject に自動切替しない。

## 8. 推奨 PR 分割

1. forecast と investment decision の use case テスト作成
2. dashboard 集計 API 実装
3. trend API 実装
4. frontend で dashboard/settings/life-plans の合成表示を実装

# FRONTEND_MIGRATION_MAP

## 0. 位置づけ

本書は、`mockups/` を参照しながら `frontend/` へ本実装を移植するための責務分解を固定する。正本は以下とする。

- [SCREEN_DESIGN.md](./SCREEN_DESIGN.md)
- [API_SPECIFICATION.md](./API_SPECIFICATION.md)
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

`mockups/` は画面導線と見た目の参照であり、コードの直コピー元ではない。

## 1. 全体方針

### 1.1 技術責務

| 層 | 主責務 |
| --- | --- |
| `app` | route、layout、middleware、provider |
| `page-components` | 1 画面を成立させる composition |
| `widgets` | 複数 feature / entity を束ねた UI ブロック |
| `features` | user action 単位の form、mutation、local hook |
| `entities` | API client、DTO 型、query/mutation hook、変換 |
| `shared` | 汎用 UI、format、validation、http client |
| `store` | auth など横断状態のみ |

### 1.2 Redux と React Query

- Redux は `auth` とアプリ横断 UI 状態だけに使う。
- React Query は server state の取得と mutation 後の再取得に使う。
- 月次記録、設定、ライフプラン、ダッシュボードの主データは Redux に複製しない。
- form の入力途中状態は feature 内に閉じる。

### 1.3 `mockups/` から持ち込むもの

| 持ち込む | 持ち込まない |
| --- | --- |
| 画面導線 | store 全体構造 |
| UI の情報設計 | `mockups` の state shape |
| 文言の優先順位 | frontend 側のローカル計算本体 |
| カード分割 | routing 実装 |

- 計算は backend を正とし、frontend は API 結果表示に寄せる。
- frontend で再計算するのは、グラフ表示やフォーム補助のための軽微な派生値だけに留める。

## 2. Route ごとの責務分解

| Route | `page-components` | 主な `widgets` | 主な `features` | 主な `entities` | 備考 |
| --- | --- | --- | --- | --- | --- |
| `/login` | `page-components/login` | `login-form` | `features/auth/login` | `entities/auth` | login 成功で `/dashboard` |
| `/signup` | `page-components/signup` | `signup-form` | `features/auth/signup` | `entities/auth` | signup 後は `/login` へ戻す |
| `/password-reset/request` | `page-components/password-reset-request` | `password-reset-request-form` | `features/auth/password-reset-request` | `entities/auth` | token を画面表示しない |
| `/password-reset/reset` | `page-components/password-reset-reset` | `password-reset-reset-form` | `features/auth/password-reset-reset` | `entities/auth` | query の token を feature が受け取る |
| `/dashboard` | `page-components/dashboard` | `dashboard-kpis` `asset-summary-card` `investment-composition-card` `investment-decision-card` `trend-panel` | `features/dashboard/change-trend-subject` `features/dashboard/change-trend-period` | `entities/dashboard` `entities/settings` `entities/life-plan` | 不足理由表示のため settings/life-plans を併用 |
| `/monthly-record` | `page-components/monthly-record` | `month-selector` `deadline-banner` `assets-card` `incomes-card` `investment-valuations-card` `confirm-bar` `confirm-modal` | `features/monthly-record/asset-editor` `income-editor` `investment-valuation-editor` `confirm-month` | `entities/monthly-record` | confirmability は API 結果を正とする |
| `/life-plan` | `page-components/life-plan` | `life-plan-list` `life-plan-add-bar` `life-plan-edit-modal` | `features/life-plan/create` `update` `delete` | `entities/life-plan` | 一覧は近い月順 |
| `/settings` | `page-components/settings` | `effective-month-header` `emergency-fund-card` `target-allocation-card` `forecast-summary-card` | `features/settings/save-emergency-fund` `save-target-allocations` | `entities/settings` | `effective_from_month` を API から受ける |

## 3. 認証と layout

### 3.1 Route 群

- `app/(public)` に以下を置く。
  - `/login`
  - `/signup`
  - `/password-reset/request`
  - `/password-reset/reset`
- `app/(authenticated)` に以下を置く。
  - `/dashboard`
  - `/monthly-record`
  - `/life-plan`
  - `/settings`

### 3.2 middleware

- Cookie 名は `asset_management_session` を使う。
- middleware は protected path 判定と redirect だけを担当する。
- protected path は `/dashboard` `/monthly-record` `/life-plan` `/settings` に広げる。
- public auth path は `/login` `/signup` `/password-reset/request` `/password-reset/reset` に広げる。
- `/auth/status` への問い合わせに失敗した場合は未認証扱いに倒す。

### 3.3 auth 初期化

- `app/providers` で auth bootstrap を 1 回行う。
- bootstrap は `GET /auth/status` を呼び、Redux の auth slice を hydrate する。
- `401 SESSION_EXPIRED` を受けたら以下を行う。
  - auth slice を clear
  - login へ redirect
  - 必要なら toast を表示

## 4. 画面別の具体方針

### 4.1 dashboard

- 主要 query は `GET /dashboard` と `GET /dashboard/trend`。
- 投資判断カードの「算出不可理由」を出すため、`GET /settings` と `GET /life-plans` も page level で併用する。
- 理由文言の評価順は [DASHBOARD_CALC_TEST_CASES.md](./DASHBOARD_CALC_TEST_CASES.md) に合わせる。
- trend の subject と period は feature 層の state として保持し、Redux へ上げない。
- 通常資産全件モーダルは `widget` とし、`page-component` が開閉を制御する。

### 4.2 monthly-record

- `GET /monthly-records` と `GET /monthly-records/{month}` を基点にする。
- 画面側で confirmability を再計算しない。
- sticky confirm bar は API の `can_confirm`、`confirm_error_code`、`confirm_error` をそのまま使う。
- 追加/編集/削除/復活の mutation は feature ごとに分け、成功後に対象月 query を再取得する。
- 対象月切替は `page-component` が持ち、編集 modal は widget または feature 内に閉じる。

### 4.3 life-plan

- 画面は `GET /life-plans` の一覧表示を中心にする。
- create/update/delete は feature を分ける。
- add/edit modal は同一 widget を共有してよい。
- 並び順は API の近い年月順をそのまま使い、frontend で独自 sort しない。

### 4.4 settings

- 主要 query は `GET /settings` のみとする。
- 生活防衛資金保存と投資先一括保存は別 mutation にする。
- `effective_from_month` は API 表示値をそのまま出す。
- forecast 表示も API 結果をそのまま出し、frontend で平均計算しない。
- 配分モーダル内の合計 100.00% 判定は frontend で即時表示してよいが、最終判定は backend を正とする。

## 5. 追加する entity / feature の最小単位

### 5.1 entities

- `entities/auth`
- `entities/dashboard`
- `entities/monthly-record`
- `entities/life-plan`
- `entities/settings`

### 5.2 features

- `features/auth/login`
- `features/auth/signup`
- `features/auth/password-reset-request`
- `features/auth/password-reset-reset`
- `features/auth/logout`
- `features/monthly-record/asset-editor`
- `features/monthly-record/income-editor`
- `features/monthly-record/investment-valuation-editor`
- `features/monthly-record/confirm-month`
- `features/life-plan/create`
- `features/life-plan/update`
- `features/life-plan/delete`
- `features/settings/save-emergency-fund`
- `features/settings/save-target-allocations`
- `features/dashboard/change-trend-subject`
- `features/dashboard/change-trend-period`

## 6. 実装上の禁止事項

- `mockups/src/app/store.tsx` の state shape を `frontend/` に持ち込まない。
- monthly-record の confirmability を frontend だけで再実装しない。
- settings や dashboard の forecast を frontend で再計算しない。
- dashboard の trend subject を Redux へ上げない。
- `access_token`、`login_id`、`is_authenticated` など旧型を新実装へ引き継がない。

## 7. 推奨 PR 分割

1. auth 型と middleware の正式化
2. signup / password reset 2 画面追加
3. dashboard route と widget 群の本実装
4. monthly-record route と CRUD feature 群
5. life-plan と settings route の本実装

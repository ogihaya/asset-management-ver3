# IMPLEMENTATION_PLAN

## 0. この計画書の位置づけ

本書は、[OVERVIEW.md](./OVERVIEW.md)、[REQUIREMENTS.md](./REQUIREMENTS.md)、[SCREEN_DESIGN.md](./SCREEN_DESIGN.md)、[DATABASE_DESIGN.md](./DATABASE_DESIGN.md)、[API_SPECIFICATION.md](./API_SPECIFICATION.md) を実装に落とし込むための v1 実装計画である。

- 正本は `docs/requirements/public` 配下の公開ドキュメントとする。
- `mockups/` は UI/UX、画面導線、計算挙動の参照実装とし、そのまま本番コードに流用しない。
- `backend/`、`frontend/`、`infra/` は現行の土台を活用しつつ、公開仕様との差分を埋める。
- 実装順は MVP 順とし、認証、月次記録、設定、ライフプラン、ダッシュボードの順に完成度を高める。
- 目標日は暦日ではなく `Day N` の相対日程で管理する。
- v1 の対象は公開仕様に定義された範囲に限定し、通知、外部連携、エクスポート、バックアップは対象外とする。
- 実装で迷いやすい論点は以下の別紙で補う。
  - [AUTH_IMPLEMENTATION_DETAIL.md](./AUTH_IMPLEMENTATION_DETAIL.md)
  - [MONTHLY_RULE_MATRIX.md](./MONTHLY_RULE_MATRIX.md)
  - [DASHBOARD_CALC_TEST_CASES.md](./DASHBOARD_CALC_TEST_CASES.md)
  - [FRONTEND_MIGRATION_MAP.md](./FRONTEND_MIGRATION_MAP.md)

## 1. アーキテクチャ概要

### 1.1 バックエンド

- 技術スタックは `FastAPI + SQLAlchemy + Alembic + PostgreSQL` を前提とする。
- 構成は `.claude/rules/architecture/backend.md` に従い、`domain / application / infrastructure / presentation / di` の責務分離を維持する。
- API 契約は [API_SPECIFICATION.md](./API_SPECIFICATION.md) を正本とする。
- 現状の `backend/` には認証 PoC が存在するが、`login_id/admin/pass` や `access_token` Cookie を前提とした暫定仕様であり、公開仕様の `email + password + Cookie session` に合わせて置き換える。
- 投資計算やダッシュボード集計は計算結果を恒久保存せず、必要時に再計算する。

### 1.2 フロントエンド

- 技術スタックは `Next.js 15 + React 19 + TypeScript + Feature-Sliced Design + Redux Toolkit + React Query + shadcn/ui` を前提とする。
- 構成は `.claude/rules/architecture/frontend.md` に従い、`app / page-components / widgets / features / entities / shared / store` を基本構造とする。
- `mockups/` は見た目、状態遷移、計算ルールの参照元とし、実装は `frontend/` の FSD 構造へ再分解して移植する。
- 現状の `frontend/` は認証周辺の骨組みが中心で、ダッシュボード、月次記録、設定、ライフプランは本実装が未着手のため、`mockups/` を参照しながら順次実装する。

### 1.3 インフラ

- 技術スタックは `AWS CDK (TypeScript)` を前提とする。
- 構成は `Foundation / Data / Security / Backend / Frontend / Integration / Observability` のスタック分割を踏襲する。
- v1 では、フロントエンド配信、バックエンド実行基盤、データベース、シークレット、ネットワークを優先して構成する。
- 未使用の構成要素や発展運用向け構成は後続フェーズへ回し、まずは公開仕様を満たすアプリケーション導線を優先する。

## 2. ディレクトリ構成

### 2.1 バックエンド

```text
backend/
├── alembic/
├── app/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   ├── presentation/
│   └── di/
├── tests/
└── scripts/
```

- `domain/` にエンティティ、値オブジェクト、リポジトリインターフェースを配置する。
- `application/` に use case を配置し、認証、月次記録、設定、ライフプラン、ダッシュボードのユースケースを実装する。
- `infrastructure/` に SQLAlchemy モデル、リポジトリ実装、セキュリティ実装、永続化関連を配置する。
- `presentation/` に FastAPI の router、schema、response formatter を配置する。
- `di/` に依存解決を集約し、テストしやすい構造を維持する。
- `alembic/` は [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) のテーブル作成順を反映した段階導入を行う。

### 2.2 フロントエンド

```text
frontend/
└── src/
    ├── app/
    ├── page-components/
    ├── widgets/
    ├── features/
    ├── entities/
    ├── shared/
    └── store/
```

- `app/` にルーティング、レイアウト、ページエントリ、middleware を配置する。
- `page-components/` に画面単位の構成要素を配置する。
- `widgets/` に複数 feature を束ねる表示単位を配置する。
- `features/` にログイン、サインアップ、月次記録入力、資産設定、ライフプラン編集などの操作単位を配置する。
- `entities/` に認証、月次記録、設定、ライフプラン、ダッシュボードの API 契約とモデルを配置する。
- `shared/` に API client、UI 部品、共通関数、定数、バリデーションを配置する。
- `store/` に Redux store と全体状態管理を配置する。

### 2.3 インフラ

```text
infra/
├── bin/
├── config/
├── lib/
│   ├── construct/
│   ├── resource/
│   └── stack/
└── test/
```

- `config/` に環境別設定を配置する。
- `lib/stack/` にレイヤごとのスタックを配置する。
- `lib/construct/` と `lib/resource/` に再利用部品を配置する。
- v1 ではアプリケーションを動かす最小構成を優先し、構成拡張は段階導入とする。

## 3. 実装フェーズ

### Phase 1: 実装基盤整備 `Day 1-4`

| タスクID | 内容 | 見積もり | 依存 |
| --- | --- | --- | --- |
| IMP-001 | 公開 API 仕様と現行 auth PoC の差分を整理し、置換方針を確定する | 0.5日 | なし |
| IMP-002 | users、user_sessions、password_reset_tokens を含む基盤 DB モデルと Alembic 初期 migration を実装する | 1.5日 | IMP-001 |
| IMP-003 | メールアドレスとパスワードを用いた Cookie session 認証基盤を backend に実装する | 1日 | IMP-002 |
| IMP-004 | frontend の API client、auth state、middleware を公開 auth API 仕様へ合わせて再構成する | 1日 | IMP-003 |

### Phase 2: 認証・アカウント管理 `Day 5-8`

| タスクID | 内容 | 見積もり | 依存 |
| --- | --- | --- | --- |
| IMP-101 | signup、login、logout、auth status、users/me、delete me を backend に実装する | 1日 | IMP-003 |
| IMP-102 | password reset request と password reset を backend に実装する | 1日 | IMP-101 |
| IMP-103 | login、signup、password reset request、password reset の画面を frontend に本実装する | 1.5日 | IMP-004, IMP-101, IMP-102 |
| IMP-104 | auth に関する backend pytest と frontend Jest + MSW テストを追加する | 0.5日 | IMP-103 |

### Phase 3: 月次記録・設定・ライフプラン `Day 9-15`

| タスクID | 内容 | 見積もり | 依存 |
| --- | --- | --- | --- |
| IMP-201 | 資産、収入、投資先、設定改定、月次記録、ライフプランのドメインモデルと repository/use case を実装する | 1.5日 | IMP-002 |
| IMP-202 | 定義系テーブルと履歴系テーブルを [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) の順序で migration 化する | 1.5日 | IMP-201 |
| IMP-203 | monthly-records、life-plans、settings API を公開仕様に沿って実装する | 2日 | IMP-201, IMP-202 |
| IMP-204 | 月次記録、設定、ライフプラン画面を `mockups/` を参照して frontend に本実装する | 2日 | IMP-203 |

### Phase 4: ダッシュボードと投資計算 `Day 16-20`

| タスクID | 内容 | 見積もり | 依存 |
| --- | --- | --- | --- |
| IMP-301 | 将来収支予測、投資可能額、リバランス配分の計算ロジックを backend に実装する | 1.5日 | IMP-203 |
| IMP-302 | dashboard と dashboard/trend API を実装する | 1日 | IMP-301 |
| IMP-303 | ダッシュボード画面を `mockups/` ベースで frontend に本実装する | 1.5日 | IMP-302 |
| IMP-304 | グラフ、空状態、計算不可理由表示、最新確定月基準の文言を統合し、mockup と表示差異を解消する | 1日 | IMP-303 |

### Phase 5: 仕上げ・運用接続 `Day 21-24`

| タスクID | 内容 | 見積もり | 依存 |
| --- | --- | --- | --- |
| IMP-401 | Swagger 出力、seed/fixture、手動確認データを整備する | 1日 | IMP-302 |
| IMP-402 | backend、frontend、infra の CI 前提に沿ってテスト、lint、build、synth を通す | 1日 | IMP-104, IMP-204, IMP-304 |
| IMP-403 | env、secret、stack 反映点を整理し、v1 デプロイに必要なインフラ接続を確定する | 1日 | IMP-402 |
| IMP-404 | 公開ドキュメントと実装差分を確認し、必要な追記や補正を行う | 1日 | IMP-403 |

## 4. マイルストーン

| # | マイルストーン | 完了条件 | 目標日 |
| --- | --- | --- | --- |
| MS1 | 認証基盤と DB 基盤の整備完了 | 認証方式の置換方針が確定し、基盤 migration と session 認証が動作する | Day 4 |
| MS2 | 認証・アカウント機能の疎通完了 | 認証 API と認証画面が公開仕様どおりに連携し、主要 auth テストが通る | Day 8 |
| MS3 | 月次記録、設定、ライフプラン導線の実装完了 | 入力、更新、確定、履歴参照の主要導線が backend/frontend で動作する | Day 15 |
| MS4 | ダッシュボードと投資計算の実装完了 | 最新確定月基準の集計、推移、投資可能額、配分結果が表示される | Day 20 |
| MS5 | v1 リリース準備完了 | CI、主要テスト、ドキュメント整合、デプロイ前提が揃う | Day 24 |

## 5. リスクと対策

| リスク | 内容 | 対策 |
| --- | --- | --- |
| 既存 auth PoC と公開仕様の乖離 | 現行 backend/frontend は `login_id` や `access_token` Cookie を前提としており、そのまま増築すると仕様逸脱が広がる | 認証は増築ではなく置換とし、Phase 1 で契約差分を固定する |
| mockup と frontend 実装方式の差 | `mockups/` は単一アプリ前提で、`frontend/` は FSD 構成であるため、そのまま移植すると責務が崩れる | UI と挙動を参照しつつ、画面、widget、feature、entity に再分解して実装する |
| 月次記録と設定履歴の業務ロジックが複雑 | 月確定条件、次月自動追加、資産の表示期間、設定改定履歴の影響範囲が広い | use case 単位でテストを厚くし、ロジックを presentation から分離する |
| 計算ロジックの不整合 | 投資可能額や配分結果が mockup とズレると仕様の信頼性が崩れる | `mockups/src/lib/calculations.ts` を参照してテストケースを作り、公開仕様と突き合わせる |
| インフラ構成が広く v1 で過剰になりやすい | CDK スタックが多層で、v1 に不要な構成まで触れると実装が遅延する | フロントエンド配信、バックエンド実行、DB、secret、network の最小経路を優先する |

## 6. 技術的判断

1. 公開ドキュメントを正本とし、現行コードはそれに合わせて補正する。
2. 認証は `email + password + Cookie session` を採用し、現行の `login_id/admin/pass` 前提は維持しない。
3. 月次入力の未入力は「値が保存されていない状態」で表現し、仮値やダミー値で埋めない。
4. ダッシュボード集計、将来収支予測、投資可能額、配分結果は保存値ではなく計算結果として扱う。
5. フロントエンド本実装は `mockups/` のコードをそのまま複製せず、`frontend/` の FSD 構造へ適切に分解して実装する。
6. DB migration の順序は [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) に従い、認証基盤、定義系、設定改定、月次記録、ライフプランの順に導入する。
7. v1 では通知、外部サービス連携、データエクスポート、バックアップ管理機能は対象外とする。

## 7. 検証方針

- backend は `domain / application / infrastructure / presentation` の各層で pytest を整備する。
- frontend は Jest + MSW を用いて auth、route guard、主要画面の状態分岐を検証する。
- infra は `build / test / synth` を継続的に通し、スタック構成の破綻を防ぐ。
- monthly record、settings、life plan、dashboard の主要導線は `mockups/` と見比べ、表示差と計算差を確認する。
- 受入確認では以下を最低条件とする。
  - auth が公開仕様どおりの Cookie session 挙動を満たすこと
  - 月次確定条件、次月自動追加、資産ライフサイクルが公開仕様と一致すること
  - 投資計算とダッシュボード表示が公開仕様および mockup 参照挙動と一致すること
  - backend、frontend、infra の CI が通ること

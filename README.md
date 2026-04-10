# AI Solution Template

**Next.js 15 + FastAPI + AWS CDK** で構築されたエンタープライズグレードのフルスタックテンプレート

## 📖 プロジェクト概要

このリポジトリは、受託の新規プロジェクトを素早く立ち上げるための開発基盤テンプレートです。

### 🎯 このリポジトリの役割

- **フロントエンド**: Next.js 15 (App Router) + FSD アーキテクチャ
- **バックエンド**: FastAPI + オニオンアーキテクチャ
- **インフラ**: AWS CDK + 4層レイヤードアーキテクチャ
- **CI/CD**: GitHub Actions + AWS OIDC

### 技術スタック

#### Frontend

- **Next.js 15.3.2** (App Router) + **React 19.2.0** + **TypeScript 5.4.5**
- **shadcn/ui** + **Tailwind CSS 3.4.3**
- **Redux Toolkit 2.2.0** (グローバル状態管理)
- **TanStack React Query 5.28.0** (サーバー状態管理)
- **React Hook Form 7.51.0** + **Zod 3.22.4** (フォーム管理)

#### Backend

- **FastAPI** + **Python 3.11+**
- **PostgreSQL 15**
- **JWT 認証** (RS256)
- **SQLAlchemy** (ORM)

#### Infrastructure

- **Docker** + **Docker Compose**
- **AWS CDK** (TypeScript)
- **GitHub Actions**

---

### アクセス

起動後、以下の URL にアクセスできます：

- **フロントエンド**: http://localhost:3000
- **バックエンド API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **PostgreSQL**: localhost:55432
- **pgAdmin**: http://localhost:58080

Docker 開発環境は `make up` / `make down` などの `make` 経由を正とします。  
このリポジトリでは `Makefile` 側で Compose project 名を固定しているため、`docker compose up` を直接叩く運用は前提にしません。

テンプレート由来の旧 `db_data/` が手元に残っていても、このリポジトリの PostgreSQL 永続化先は `db_data_asset_management/` を使います。

### 開発環境のセットアップ

#### pre-commit（コミット前チェック）

```bash
# pre-commit をインストール
pip install pre-commit

# hooks をインストール
pre-commit install
```

これにより以下が有効になります：

- **main/master ブランチへの直接コミット禁止**
- **git-secrets による秘密情報の検出**

#### git-secrets（秘密情報の保護）

```bash
# macOS
brew install git-secrets

# セットアップスクリプトを実行
tools/setup-git-secrets.sh
```

検出される秘密情報：

- AWS 認証情報（Access Key ID, Secret Access Key）
- Anthropic API Key（`sk-ant-api...`）
- OpenAI API Key（`sk-...`）

---

## 📚 ドキュメント構成

ドキュメントは **3つの責務** で整理されています。

### 📐 アーキテクチャ設計 ([`docs/rules/architecture`](./docs/rules/architecture))

システムの設計思想と構造を理解するためのドキュメント

- **[フロントエンド](./docs/rules/architecture/FRONTEND.md)** - FSD アーキテクチャ、レイヤー構成
- **[バックエンド](./docs/rules/architecture/BACKEND.md)** - オニオンアーキテクチャ、依存関係ルール
- **[インフラ](./docs/rules/architecture/INFRASTRUCTURE.md)** - 4層レイヤードアーキテクチャ、スタック構成

### 💻 開発ガイド ([`docs/rules/development`](./docs/rules/development))

実装方法とコーディング規約のドキュメント

- **[フロントエンド開発](./docs/rules/development/FRONTEND.md)** - 環境構築、開発フロー、API連携
- **[バックエンド開発](./docs/rules/development/BACKEND.md)** - 実装済み機能、開発の流れ
- **[テスト](./docs/rules/development/TESTING.md)** - ユニットテスト、結合テスト

### ⚙️ 運用・セットアップ ([`docs/rules/operations`](./docs/rules/operations))

デプロイ、カスタマイズ、運用のドキュメント

- **[カスタマイズガイド](./docs/rules/operations/CUSTOMIZATION.md)** - 新規プロジェクト開始時必読
- **[PoCセットアップ](./docs/rules/operations/POC_SETUP_GUIDE.md)** - PoC Stack構成
- **[CI/CDガイド](./docs/rules/operations/CI_CD_GUIDE.md)** - GitHub Actionsワークフロー
- **[CI/CDセットアップ](./docs/rules/operations/CI_CD_SETUP.md)** - AWS OIDC設定
- **[データベース変更ガイド](./docs/rules/operations/DATABASE_CHANGE.md)** - DB種類の変更手順
- **[リビジョン履歴](./docs/revision/)** - テンプレートの変更履歴（日付別）

---

## 📂 ディレクトリ構成

```
ai-solution-template/
├── frontend/          # Next.js フロントエンド
│   └── README.md      # フロントエンド固有のドキュメント
├── backend/           # FastAPI バックエンド
│   └── README.md      # バックエンド固有のドキュメント
├── infra/             # AWS CDK インフラ定義
│   └── README.md      # インフラ固有のドキュメント
├── .github/
│   └── workflows/     # GitHub Actions ワークフロー
│       └── README.md  # CI/CD固有のドキュメント
├── docs/              # プロジェクト全体のドキュメント
│   └── rules/         # ルール・ガイドライン
│       ├── architecture/  # アーキテクチャ設計
│       ├── development/   # 開発ガイド
│       └── operations/    # 運用・セットアップ
└── README.md          # このファイル
```

各ディレクトリの詳細は、それぞれのREADME.mdを参照してください：

- **[frontend/README.md](./frontend/README.md)** - フロントエンド開発
- **[backend/README.md](./backend/README.md)** - バックエンド開発
- **[infra/README.md](./infra/README.md)** - インフラ管理
- **[.github/workflows/README.md](./.github/workflows/README.md)** - CI/CD設定

---

## 💻 開発コマンド（Makefile）

プロジェクトルートで `make help` を実行すると全コマンドを確認できます。

### Docker

| コマンド     | 説明                               |
| ------------ | ---------------------------------- |
| `make up`    | 全サービスをバックグラウンドで起動 |
| `make down`  | 全サービスを停止                   |
| `make build` | Dockerイメージをビルド             |
| `make logs`  | ログをリアルタイム表示             |

### 開発

| コマンド           | 説明                                     |
| ------------------ | ---------------------------------------- |
| `make test`        | バックエンドのテストを実行               |
| `make lint`        | Lint（Backend + Frontend）               |
| `make format`      | Format（Backend + Frontend）             |
| `make onion-check` | オニオンアーキテクチャの依存関係チェック |

### データベース

| コマンド                        | 説明                           |
| ------------------------------- | ------------------------------ |
| `make db-migrate msg='message'` | マイグレーションファイルを作成 |
| `make db-upgrade`               | マイグレーションを適用         |

### セキュリティ

| コマンド                 | 説明                   |
| ------------------------ | ---------------------- |
| `make generate-rsa-keys` | JWT用のRSA鍵ペアを生成 |

---

## 🎨 このテンプレートをカスタマイズする

新しいプロジェクトを開始する際は、以下のドキュメントを参照してください：

**[カスタマイズガイド](./docs/rules/operations/CUSTOMIZATION.md)**

---

## 📖 API仕様

- **Swagger UI**: http://localhost:8000/docs
- **OpenAPI 仕様書**: [openapi.json](./backend/documents/api/openapi.json)
- **Swagger HTML**: [swagger.html](./backend/documents/api/swagger.html)

main ブランチへの push 時、`backend/app/presentation/`配下のファイルが変更されると、GitHub Actions によって自動的にドキュメントが更新されます。

---

**最終更新**: 2026-02-11
**バージョン**: 3.0.0

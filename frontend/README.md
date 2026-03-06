# Frontend

Next.js 15 + React 19 + TypeScript で構築されたエンタープライズグレードのフロントエンドです。

**FSD (Feature-Sliced Design)** アーキテクチャを採用し、保守性と拡張性に優れた設計になっています。

## 📚 ドキュメント

詳細なドキュメントは [`../docs/rules`](../docs/rules) を参照してください。

### アーキテクチャ
- **[アーキテクチャ設計](../docs/rules/architecture/FRONTEND.md)** - FSD設計、技術スタック、レイヤー構造

### 開発ガイド
- **[開発ガイド](../docs/rules/development/FRONTEND.md)** - 環境構築、開発フロー、実装例
- **[テストガイド](../docs/rules/development/TESTING.md)** - テストの書き方、Jest、React Testing Library

---

## ⚡ クイックスタート

### 🔧 前提条件

- **Node.js 20+**
- **Docker Desktop**（推奨）
- **npm または yarn**

### 🚀 セットアップ（3ステップ）

#### 方法1: Docker Compose を使用（推奨）

```bash
# プロジェクトルートで実行
cd ..
make up

# または
docker compose up -d
```

**起動後のアクセス:**
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

#### 方法2: ローカル環境で実行

```bash
# 1. 依存関係のインストール
npm install

# 2. 環境変数の設定
cp .env.local.example .env.local

# 3. 開発サーバーの起動
npm run dev
```

> **Note**: バックエンドAPIも別途起動する必要があります。

詳細は **[開発ガイド](../docs/rules/development/FRONTEND.md)** を参照してください。

---

## 💻 開発コマンド

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバー起動 (http://localhost:3000) |
| `npm run build` | 本番用ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | ESLint実行（FSD境界ルール含む） |
| `npm run format` | Prettier実行（自動フォーマット） |
| `npm run test` | Jestテスト実行 |
| `npm run test:watch` | Jestテスト（ウォッチモード） |
| `npm run type-check` | TypeScript型チェック |

---

## 🏗️ 技術スタック

### コアフレームワーク
- **Next.js 15.3.2** (App Router)
- **React 19.2.0**
- **TypeScript 5.4.5**

### 主要ライブラリ
- **shadcn/ui** + **Tailwind CSS 3.4.3** - UIコンポーネント
- **Redux Toolkit 2.2.0** - グローバル状態管理
- **TanStack React Query 5.28.0** - サーバー状態管理
- **React Hook Form 7.51.0** + **Zod 3.22.4** - フォーム管理
- **Axios 1.6.8** - HTTP通信
- **Jest 29.7.0** + **React Testing Library 16.1.0** - テスト

詳細は **[アーキテクチャ設計](../docs/rules/architecture/FRONTEND.md)** を参照してください。

---

## 📁 プロジェクト構造

このプロジェクトは **FSD (Feature-Sliced Design)** アーキテクチャを採用しています。

```
frontend/src/
├── app/                  # Next.js App Router（ルーティング）
├── page-components/      # ページコンポーネント
├── widgets/              # 再利用可能なウィジェット
├── features/             # ビジネスロジック・Hooks
├── entities/             # ドメインモデル・API
├── shared/               # 共有コンポーネント・ユーティリティ
└── store/                # Redux store
```

**依存関係ルール**: 上位層→下位層のみimport可能（ESLintで自動チェック）

詳細は **[アーキテクチャ設計](../docs/rules/architecture/FRONTEND.md)** を参照してください。

---

## 📖 関連ドキュメント

詳細は [`../docs/rules`](../docs/rules) を参照してください。

- **[アーキテクチャ](../docs/rules/architecture/FRONTEND.md)** - システム設計
- **[開発ガイド](../docs/rules/development/FRONTEND.md)** - 実装方法
- **[テストガイド](../docs/rules/development/TESTING.md)** - テストの書き方
- **[カスタマイズガイド](../docs/rules/operations/CUSTOMIZATION.md)** - プロジェクト固有の設定方法

---

**最終更新**: 2025-11-21
**バージョン**: 2.0.0

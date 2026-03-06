# Infrastructure

AWS CDK (TypeScript) を使用したインフラストラクチャ定義です。

**4 層レイヤードアーキテクチャ**を採用し、再利用性と保守性に優れた設計になっています。

## 📚 ドキュメント

詳細なドキュメントは [`../docs/rules`](../docs/rules) を参照してください。

### アーキテクチャ

- **[アーキテクチャ設計](../docs/rules/architecture/INFRASTRUCTURE.md)** - 4 層レイヤードアーキテクチャ、スタック構成

### 運用ガイド

- **[デプロイガイド](../docs/rules/operations/DEPLOYMENT.md)** - デプロイ手順、環境別設定
- **[クイックスタート](../docs/rules/operations/QUICK_START.md)** - どの構成を選ぶか、初期セットアップ
- **[PoC セットアップ](../docs/rules/operations/POC_SETUP_GUIDE.md)** - PoC Stack（AllInOne 構成）

---

## ⚡ クイックスタート

### 🔧 前提条件

- **Node.js 18+**
- **AWS CLI** 設定済み
- **AWS CDK CLI** インストール済み

```bash
npm install -g aws-cdk
```

### 🚀 セットアップ

```bash
# 1. 依存関係のインストール
npm install

# 2. ビルド
npm run build

# 3. CDKブートストラップ（初回のみ）
cdk bootstrap
```

### デプロイ

#### 開発環境（dev）

```bash
# 全スタックを確認
cdk list --context env=dev

# CloudFormationテンプレートを生成
cdk synth --context env=dev

# 全スタックをデプロイ
cdk deploy --all --context env=dev

# 特定のスタックのみデプロイ
cdk deploy dev-ApplicationStack --context env=dev
```

#### 本番環境（prod）

```bash
cdk deploy --all --context env=prod
```

詳細は **[デプロイガイド](../docs/rules/operations/DEPLOYMENT.md)** を参照してください。

---

## 💻 開発コマンド

```bash
# スタック一覧を表示
cdk list --context env=dev

# CloudFormationテンプレートを表示
cdk synth --context env=dev

# デプロイ前の差分確認
cdk diff dev-BackendStack --context env=dev

# 特定スタックを削除
cdk destroy dev-BackendStack --context env=dev

# ビルド
npm run build

# ウォッチモード（コード変更を監視）
npm run watch

# テスト
npm test
```

---

## 📁 プロジェクト構造

**4 層レイヤードアーキテクチャ**

```
infra/
├── bin/              # レイヤー4: プロジェクト構成
├── lib/
│   ├── construct/    # レイヤー1: 単一AWSリソースの抽象化
│   ├── resource/     # レイヤー2: 機能単位の組み合わせ
│   └── stack/        # レイヤー3: デプロイ単位
├── config/           # 環境別設定
└── lambda/           # Lambda関数コード
```

詳細は **[アーキテクチャ設計](../docs/rules/architecture/INFRASTRUCTURE.md)** を参照してください。

---

### 詳細ガイド

- **[変更ログ](./CHANGELOG_DATABASE.md)** - v2.0.0 での変更内容

---

## 📖 関連ドキュメント

詳細は [`../docs/rules`](../docs/rules) を参照してください。

- **[アーキテクチャ](../docs/rules/architecture/INFRASTRUCTURE.md)** - システム設計
- **[デプロイガイド](../docs/rules/operations/DEPLOYMENT.md)** - デプロイ手順
- **[クイックスタート](../docs/rules/operations/QUICK_START.md)** - 初期セットアップ
- **[変更ログ](./CHANGELOG_DATABASE.md)** - データベース設定の変更履歴

---

**最終更新**: 2025-12-01
**バージョン**: 2.2.0 (データベース設定形式変更: enableRds/enableAurora/enableDynamo)

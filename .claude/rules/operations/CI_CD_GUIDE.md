# CI/CD ガイド

## 概要

GitHub Actionsを使用したCI/CDパイプライン。

```
.github/workflows/
├── backend-ci.yml      # バックエンドCI
├── frontend-ci.yml     # フロントエンドCI
├── infra-ci.yml        # インフラCI
├── deploy-auto.yml     # 自動デプロイ
├── deploy-manual.yml   # 手動承認デプロイ
└── update-swagger.yml  # Swagger自動更新
```

---

## CI ワークフロー

### Backend CI (`backend-ci.yml`)

**トリガー:** `backend/**` の変更時（push/PR）

| ジョブ | 内容 |
|--------|------|
| ruff-check | Lint & Format チェック |
| architecture-check | オニオンアーキテクチャ検証 |
| build-check | Docker ビルド & 起動テスト |
| test | pytest（PostgreSQL使用） |

```yaml
# 実行例
- run: ruff check .
- run: python scripts/check_onion_architecture.py
- run: pytest --cov=app
```

### Frontend CI (`frontend-ci.yml`)

**トリガー:** `frontend/**` の変更時（push/PR）

| ジョブ | 内容 |
|--------|------|
| test | ビルド & Jest テスト |

```yaml
# 実行例
- run: npm ci
- run: npm run build
- run: npm test -- --ci
```

### Infra CI (`infra-ci.yml`)

**トリガー:** `infra/**` の変更時（push/PR）

| ジョブ | 内容 |
|--------|------|
| build-and-test | TypeScript ビルド & Jest テスト |
| cdk-synth | CDK テンプレート検証 |

```yaml
# 実行例
- run: npm run build
- run: npm test -- --ci --coverage
- run: cdk synth --all --quiet
```

---

## デプロイワークフロー

### ブランチとデプロイ先

```
develop → Staging環境
main    → Production環境
```

### deploy-auto.yml（自動デプロイ）

- **承認:** 不要
- **用途:** 迅速な開発サイクル

### deploy-manual.yml（手動承認デプロイ）

- **承認:** Production環境のみ必要
- **用途:** 本番環境への慎重なデプロイ

### デプロイ順序

```
1. detect-changes    # 変更検出
       ↓
2. deploy-infra      # CDKデプロイ
       ↓
3. deploy-backend    # ECRプッシュ & ECS更新
       ↓
4. migrate-database  # Alembicマイグレーション
```

---

## Swagger自動更新 (`update-swagger.yml`)

**トリガー:** `main`ブランチへの `backend/app/presentation/**` 変更時

API仕様書（`backend/documents/api/`）を自動更新してコミット。

---

## セットアップ

### 1. AWS OIDC プロバイダー

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 2. IAMロール作成

STG/PROD環境用のロールを作成し、以下の信頼ポリシーを設定：

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:ORG/REPO:ref:refs/heads/BRANCH"
      }
    }
  }]
}
```

### 3. GitHub Secrets

| Secret | 説明 |
|--------|------|
| `AWS_ROLE_ARN_STG` | STG環境用IAMロールARN |
| `AWS_ROLE_ARN_PROD` | PROD環境用IAMロールARN |

### 4. GitHub Environments

| 環境 | 設定 |
|------|------|
| staging | Protection rules なし |
| production | Required reviewers 設定 |

### 5. CDK Bootstrap

```bash
cd infra
npx cdk bootstrap aws://ACCOUNT_ID/REGION --context envName=stg
npx cdk bootstrap aws://ACCOUNT_ID/REGION --context envName=prod
```

---

## ワークフロー選択

どちらか一方を有効にして使用：

```bash
# 自動デプロイを使用
git mv .github/workflows/deploy-manual.yml .github/workflows/deploy-manual.yml.disabled

# または手動承認デプロイを使用
git mv .github/workflows/deploy-auto.yml .github/workflows/deploy-auto.yml.disabled
```

---

## トラブルシューティング

### AWS認証エラー

```
Error: Could not assume role with OIDC
```

→ OIDCプロバイダー、IAMロール信頼ポリシー、GitHub Secretsを確認

### CDK Deploy失敗

```
Error: Stack XXX is in UPDATE_ROLLBACK_COMPLETE state
```

→ CloudFormationコンソールでスタックを削除後、再デプロイ

---

## 参考リンク

- [GitHub Actions OIDC](https://docs.github.com/ja/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [GitHub Environments](https://docs.github.com/ja/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/home.html)

---

**最終更新**: 2025-12-23
**バージョン**: 2.0.0

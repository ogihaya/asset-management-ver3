# デプロイワークフロー セットアップ

デプロイワークフローを有効にするための設定手順。

---

## 1. ワークフローの選択

どちらか一方を選択して使用：

| ワークフロー | 特徴 | 推奨シーン |
|-------------|------|----------|
| **deploy-auto.yml** | 承認なしで自動デプロイ | 開発初期、迅速なイテレーション |
| **deploy-manual.yml** | Production承認が必要 | 本番運用、慎重なリリース |

```bash
# 自動デプロイを使用
git mv .github/workflows/deploy-manual.yml .github/workflows/deploy-manual.yml.disabled

# または手動承認デプロイを使用
git mv .github/workflows/deploy-auto.yml .github/workflows/deploy-auto.yml.disabled
```

---

## 2. 必須設定

### AWS側

#### 2.1 OIDCプロバイダー（1回のみ）

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

#### 2.2 IAMロール（STG/PROD各1つ）

信頼ポリシー（`YOUR_ACCOUNT_ID`、`YOUR_ORG/YOUR_REPO`を置換）：

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike": { "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/*" }
    }
  }]
}
```

```bash
# STG用
aws iam create-role --role-name github-actions-stg-role \
  --assume-role-policy-document file://trust-policy.json
aws iam attach-role-policy --role-name github-actions-stg-role \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# PROD用
aws iam create-role --role-name github-actions-prod-role \
  --assume-role-policy-document file://trust-policy.json
aws iam attach-role-policy --role-name github-actions-prod-role \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

#### 2.3 CDK Bootstrap

```bash
cd infra && npm install
npx cdk bootstrap aws://ACCOUNT_ID/ap-northeast-1 --context envName=stg
npx cdk bootstrap aws://ACCOUNT_ID/ap-northeast-1 --context envName=prod
```

### GitHub側

#### 2.4 Secrets

Settings → Secrets and variables → Actions に追加：

| Secret | 値 |
|--------|-----|
| `AWS_ROLE_ARN_STG` | `arn:aws:iam::ACCOUNT_ID:role/github-actions-stg-role` |
| `AWS_ROLE_ARN_PROD` | `arn:aws:iam::ACCOUNT_ID:role/github-actions-prod-role` |

#### 2.5 Environments

Settings → Environments で作成：

| 環境名 | 設定 |
|--------|------|
| `staging` | Protection rules なし |
| `production` | Required reviewers 設定（deploy-manual.yml使用時） |

---

## 3. デプロイ確認

```
develop → staging環境
main    → production環境
```

設定完了後、`develop`または`main`にpushすると自動でワークフローが実行される。

---

## 4. チェックリスト

- [ ] OIDCプロバイダー作成
- [ ] IAMロール作成（STG/PROD）
- [ ] CDK Bootstrap実行（STG/PROD）
- [ ] GitHub Secrets設定
- [ ] GitHub Environments作成
- [ ] 不要なワークフローを無効化

---

**最終更新**: 2025-12-23
**バージョン**: 2.0.0

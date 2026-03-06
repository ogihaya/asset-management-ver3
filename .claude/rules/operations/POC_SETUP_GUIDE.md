# PoC Stack セットアップガイド

## 🎯 概要

このPoC Stackは、小規模プロジェクト（MVP、PoC）向けの**最小構成**で設計されています。
初期段階では必要最小限のリソースのみを有効化し、プロジェクトの成長に応じて段階的に機能を追加できます。

---

## 📦 初期構成（デフォルト）

### **有効なリソース（約30リソース）**

| カテゴリ | リソース | 目的 |
|---------|---------|------|
| **ネットワーク** | VPC, Subnets, IGW, NAT Gateway | 基盤ネットワーク |
| **バックエンド** | Lambda, API Gateway | 軽量なAPI（サーバーレス） |
| **データベース** | DynamoDB | NoSQLデータベース（低コスト） |
| **フロントエンド** | S3, CloudFront | 静的ホスティング + CDN |

**デプロイ時間**: 約10-15分  
**月額コスト目安**: $10-30（無料枠利用時はほぼ無料）

---

### **コメントアウトされているリソース**

以下のリソースは初期段階では不要なため、コメントアウトされています。
必要になったらコメントを外して有効化してください。

| カテゴリ | リソース | 追加時期の目安 |
|---------|---------|-------------|
| **データベース** | Aurora PostgreSQL | リレーショナルDBが必要になったら |
| **データベース** | S3 Data Bucket | 大量のファイル保存が必要になったら |
| **コンピューティング** | ECS + ALB | 長時間実行処理が必要になったら |
| **セキュリティ** | Cognito User Pool | ユーザー認証が必要になったら |
| **セキュリティ** | Secrets Manager | シークレット管理が必要になったら |
| **統合** | SNS + SQS | 非同期処理が必要になったら |
| **監視** | CloudWatch Dashboard + Alarms | 本格的な監視が必要になったら |

---

## 🚀 デプロイ方法

### **1. 初回デプロイ（最小構成）**

```bash
# ビルド
npm run build

# デプロイ
cdk deploy -a "npx ts-node bin/poc-app.ts" --context env=dev

# または、package.jsonにスクリプトを追加している場合
npm run poc:deploy
```

### **2. デプロイ完了後の確認**

```bash
# 出力されるURL:
# - ApiGatewayUrl: https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/
# - FrontendUrl: https://xxxxx.cloudfront.net/
# - AlbDnsName: xxx-alb-xxxxx.ap-northeast-1.elb.amazonaws.com
```

### **3. 動作確認**

```bash
# API Gatewayにリクエスト
curl https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/hello

# DynamoDBテーブル確認
aws dynamodb describe-table --table-name dev-cdk-template-poc-table
```

---

## 📈 段階的な機能追加

プロジェクトが成長したら、以下の順序で機能を追加していきます。

### **フェーズ1: 最小構成（初期デプロイ時）**

✅ VPC  
✅ Lambda + API Gateway  
✅ DynamoDB  
✅ S3 + CloudFront  

**リソース数**: 約30個  
**月額コスト**: $10-30

---

### **フェーズ2: ユーザー認証の追加**

ユーザー登録・ログイン機能が必要になった場合：

```typescript
// lib/stack/poc/poc-stack.ts 内で以下のコメントを外す

// ========================================
// 3. Security（セキュリティ）
// ========================================
console.log('🔒 Creating Security resources...');
const security = new SecurityResource(this, 'Security', {
  userPoolName: `${config.envName}-${systemName}-users`,
  userPoolClientName: `${config.envName}-${systemName}-client`,
  secretName: `${config.envName}/${systemName}/secrets`,
});

// Outputsセクションも有効化
new cdk.CfnOutput(this, 'UserPoolId', {
  value: security.userPool.userPoolId,
  description: 'Cognito User Pool ID',
  exportName: `${config.envName}-${systemName}-UserPoolId`,
});
```

**追加リソース数**: +5個  
**追加コスト**: 無料枠内

---

### **フェーズ3: リレーショナルDBの追加**

SQLデータベースが必要になった場合：

```typescript
// lib/stack/poc/poc-stack.ts 内で以下のコメントを外す

// Aurora接続の許可
database.auroraSecurityGroup.connections.allowFrom(
  api.lambdaFunction,
  ec2.Port.tcp(5432),
  'Allow Lambda to Aurora'
);
```

**注意**: Auroraは自動的に作成されていますが、権限設定をコメントアウトしているだけです。  
使わない場合は、`DatabaseResource`内でAuroraの作成自体をコメントアウトすることも検討してください。

**追加コスト**: 約$40-80/月（最小構成）

---

### **フェーズ4: 長時間実行処理の追加**

コンテナベースの処理が必要になった場合：

```typescript
// lib/stack/poc/poc-stack.ts 内で以下のコメントを外す

// ECSタスクにDynamoDBの読み書き権限を付与
database.dynamoTable.grantReadWriteData(
  api.ecsService.taskDefinition.taskRole
);
```

**注意**: ECS + ALBは自動的に作成されていますが、IAM権限だけコメントアウトしています。

**追加コスト**: 約$30-50/月

---

### **フェーズ5: 非同期処理の追加**

イベント駆動、バックグラウンド処理が必要になった場合：

```typescript
// lib/stack/poc/poc-stack.ts 内で以下のコメントを外す

// ========================================
// 6. Integration（メッセージング統合）
// ========================================
console.log('🔗 Creating Integration resources...');
const integration = new MessagingResource(this, 'Integration', {
  topicName: `${config.envName}-${systemName}-topic`,
  queueName: `${config.envName}-${systemName}-queue`,
  dlqName: `${config.envName}-${systemName}-dlq`,
});

// Lambda関数をSNSトピックにサブスクライブ
integration.addLambdaSubscription(api.lambdaFunction);
```

**追加リソース数**: +4個  
**追加コスト**: 無料枠内

---

### **フェーズ6: 監視の強化**

本格的な監視が必要になった場合：

```typescript
// bin/poc-app.ts 内で変更

const pocStack = new PocStack(
  app,
  `${config.envName}-PocStack`,
  config,
  {
    ...stackProps,
    systemName: 'cdk-template-poc',
    enableMonitoring: true, // falseからtrueに変更
  }
);
```

さらに、`lib/stack/poc/poc-stack.ts`内のMonitoringセクションのコメントを外す。

**追加リソース数**: +6個  
**追加コスト**: 無料枠内

---

## 💰 コスト最適化のヒント

### **開発中のコスト削減**

1. **夜間・週末の停止**
   ```bash
   # 夜間は削除
   cdk destroy -a "npx ts-node bin/poc-app.ts" --context env=dev
   
   # 朝に再デプロイ
   cdk deploy -a "npx ts-node bin/poc-app.ts" --context env=dev
   ```

2. **NATゲートウェイの削減**
   ```typescript
   // config/dev.ts
   network: {
     natGateways: 0, // Public subnetのみ使用（Lambdaは外部配置）
   }
   ```

3. **Auroraを使わない**
   ```typescript
   // DatabaseResource内でAuroraの作成をコメントアウト
   ```

---

## 📊 リソース数とコストの比較

| 構成 | リソース数 | 月額コスト | デプロイ時間 |
|------|----------|----------|------------|
| **最小構成（デフォルト）** | 約30個 | $10-30 | 10-15分 |
| + Cognito | 約35個 | $10-30 | 12-17分 |
| + Aurora | 約40個 | $50-110 | 17-25分 |
| + ECS使用 | 約45個 | $80-160 | 17-25分 |
| + SNS/SQS | 約49個 | $80-160 | 17-25分 |
| + 監視強化 | 約55個 | $80-160 | 17-25分 |
| **フル構成** | 約60個 | $100-200 | 20-30分 |

---

## 🔄 7スタック構成への移行

プロジェクトが成長したら（リソース数50個以上、チーム3人以上）、
`bin/app.ts`の7スタック構成に移行することを推奨します。

### **移行手順**

1. **現在のPoC Stackを削除**
   ```bash
   cdk destroy -a "npx ts-node bin/poc-app.ts" --context env=dev
   ```

2. **7スタック構成でデプロイ**
   ```bash
   cdk deploy --all --context env=dev
   ```

3. **メリット**
   - ✅ 部分デプロイ可能（フロントエンドのみ3-5分）
   - ✅ チーム開発が容易
   - ✅ 影響範囲の最小化

---

## 📝 チェックリスト

### **デプロイ前**

- [ ] AWS CLIの認証情報設定済み
- [ ] Node.js 18.x以上インストール済み
- [ ] `npm install`実行済み
- [ ] `config/dev.ts`の`account`設定確認

### **デプロイ後**

- [ ] API Gateway URLの動作確認
- [ ] CloudFront URLの動作確認
- [ ] DynamoDBテーブルの作成確認
- [ ] Lambda関数のログ確認（CloudWatch Logs）

### **本番化前**

- [ ] Cognitoの有効化
- [ ] 監視の有効化
- [ ] カスタムドメインの設定
- [ ] SSLの設定
- [ ] バックアップの設定

---

## 🆘 トラブルシューティング

### **デプロイが失敗する**

```bash
# エラーログ確認
cdk deploy -a "npx ts-node bin/poc-app.ts" --context env=dev --verbose

# CloudFormationスタックの状態確認
aws cloudformation describe-stack-events --stack-name dev-PocStack
```

### **Lambda関数が動作しない**

```bash
# ログ確認
aws logs tail /aws/lambda/dev-cdk-template-poc-api --follow

# 環境変数確認
aws lambda get-function-configuration --function-name dev-cdk-template-poc-api
```

### **DynamoDBにアクセスできない**

```bash
# IAMロール確認
aws lambda get-function --function-name dev-cdk-template-poc-api --query Configuration.Role

# ポリシー確認
aws iam list-attached-role-policies --role-name [上記のロール名]
```

---

## 📚 参考リンク

- [AWS CDK公式ドキュメント](https://docs.aws.amazon.com/cdk/)
- [Lambda開発ガイド](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [DynamoDB開発ガイド](https://docs.aws.amazon.com/dynamodb/latest/developerguide/)
- [CloudFront開発ガイド](https://docs.aws.amazon.com/cloudfront/latest/developerguide/)

---

**作成日**: 2025-11-18  
**対象環境**: PoC, MVP, 個人開発  
**推奨期間**: プロジェクト開始〜3ヶ月


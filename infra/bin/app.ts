#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getConfig } from '../config';
import { FoundationStack } from '../lib/stack/foundation/foundation-stack';
import { DataStorageStack } from '../lib/stack/data-storage/data-storage-stack';
import { ObjectStorageStack } from '../lib/stack/object-storage/object-storage-stack';
import { SecurityStack } from '../lib/stack/security/security-stack';
import { BackendStack } from '../lib/stack/backend/backend-stack';
import { FrontendStack } from '../lib/stack/frontend/frontend-stack';
import { IntegrationStack } from '../lib/stack/integration/integration-stack';
import { ObservabilityStack } from '../lib/stack/observability/observability-stack';
import { BatchStack } from '../lib/stack/batch/batch-stack';

/**
 * メインアプリケーション
 * 
 * 四層アーキテクチャ:
 * L1: AWS CloudFormation リソース (Cfn*)
 * L2: AWS CDK L2 コンストラクト (ec2.Vpc, ecs.Cluster等)
 * L3: L2を組み合わせた「機能単位」のリソース (lib/resource/)
 * L4: L3を組み合わせた「デプロイ単位」のスタック (lib/stack/)
 * 
 * デプロイ順序:
 * 1. FoundationStack - ネットワーク基盤
 * 2. DataStorageStack - データベースストレージ（DynamoDB + RDS/Aurora）
 * 3. ObjectStorageStack - オブジェクトストレージ（S3）
 * 4. SecurityStack - 認証・認可
 * 5. BackendStack - バックエンドAPI
 * 6. FrontendStack - フロントエンド配信
 * 7. IntegrationStack - メッセージング統合
 * 8. BatchStack - バッチ処理（オプション）
 * 9. ObservabilityStack - 監視・可観測性
 */

const app = new cdk.App();

// 環境名の取得（コンテキストまたは環境変数から）
const envName = app.node.tryGetContext('env') || process.env.ENV_NAME || 'dev';
console.log(`🚀 Deploying to: ${envName}`);

// 環境設定の読み込み
const config = getConfig(envName);

// アカウントIDを環境変数から取得（configが空の場合）
const account = config.account || process.env.CDK_DEFAULT_ACCOUNT;
const region = config.region || process.env.CDK_DEFAULT_REGION || 'ap-northeast-1';

// Stack共通のprops
const stackProps: cdk.StackProps = {
  env: {
    account,
    region,
  },
  description: `CDK Template Stack (${envName}) - Four-layer architecture with L2 constructs`,
};

// ========================================
// 1. Foundation Stack（ネットワーク基盤）
// ========================================
const foundationStack = new FoundationStack(
  app,
  `${config.envName}-FoundationStack`,
  config,
  stackProps
);

// ========================================
// 2. DataStorage Stack（データベースストレージ）
// ========================================
const dataStorageStack = new DataStorageStack(
  app,
  `${config.envName}-DataStorageStack`,
  config,
  {
    ...stackProps,
    vpc: foundationStack.vpc,
  }
);
dataStorageStack.addDependency(foundationStack);

// ========================================
// 3. ObjectStorage Stack（オブジェクトストレージ）
// ========================================
const objectStorageStack = new ObjectStorageStack(
  app,
  `${config.envName}-ObjectStorageStack`,
  config,
  stackProps
);
// ObjectStorageはVPC不要なので、FoundationStackに依存しない（独立デプロイ可能）

// ========================================
// 4. Security Stack（セキュリティ）
// ========================================
const securityStack = new SecurityStack(
  app,
  `${config.envName}-SecurityStack`,
  config,
  stackProps
);
securityStack.addDependency(foundationStack);

// ========================================
// 5. Backend Stack（バックエンドAPI）
// ========================================
const backendStack = new BackendStack(
  app,
  `${config.envName}-BackendStack`,
  config,
  {
    ...stackProps,
    vpc: foundationStack.vpc,
    // データベースSGを渡し、BackendStack側でingressルールを追加（循環参照回避）
    databaseSecurityGroup: dataStorageStack.databaseSecurityGroup,
    databasePort: config.database.engine === 'mysql' ? 3306 : 5432,
    // DB認証情報をECSに注入（Secrets Manager経由）
    databaseSecret: dataStorageStack.databaseSecret,
  }
);
backendStack.addDependency(foundationStack);
backendStack.addDependency(dataStorageStack);
backendStack.addDependency(objectStorageStack);
backendStack.addDependency(securityStack);

// ========================================
// 6. Frontend Stack（フロントエンド配信）
// ========================================
const frontendStack = new FrontendStack(
  app,
  `${config.envName}-FrontendStack`,
  config,
  {
    ...stackProps,
    // Lambda有効時はAPI Gateway URL、無効時はALB URLを使用
    backendApiUrl: backendStack.apiGateway?.url || `http://${backendStack.alb.loadBalancerDnsName}`,
    // Amplify用のGitHub設定（configから取得、propsで上書き可能）
    repositoryOwner: config.frontend.repositoryOwner,
    repositoryName: config.frontend.repositoryName,
    mainBranch: config.frontend.mainBranch || 'main',
    frontendDirectory: config.frontend.frontendDirectory,
  }
);
// フロントエンドはバックエンドAPIのURLを参照するため依存関係を設定
frontendStack.addDependency(backendStack);

// ========================================
// 7. Integration Stack（統合）
// ========================================
const integrationStack = new IntegrationStack(
  app,
  `${config.envName}-IntegrationStack`,
  config,
  {
    ...stackProps,
    // Lambda Functionの統合は後から手動で設定
    // 循環参照を避けるため、ここでは渡さない
  }
);
integrationStack.addDependency(foundationStack);

// ========================================
// 8. Batch Stack（バッチ処理）※オプション
// ========================================
let batchStack: BatchStack | undefined;
if (config.batch?.enabled) {
  batchStack = new BatchStack(
    app,
    `${config.envName}-BatchStack`,
    config,
    {
      ...stackProps,
      vpc: foundationStack.vpc,
      // 既存クラスターを使用する場合はBackendStackのクラスターを渡す
      ecsCluster: config.batch.useExistingCluster !== false
        ? backendStack.ecsCluster
        : undefined,
      // データベースSGを渡してアクセス許可を設定
      databaseSecurityGroup: dataStorageStack.databaseSecurityGroup,
    }
  );
  batchStack.addDependency(foundationStack);
  batchStack.addDependency(dataStorageStack);
  batchStack.addDependency(backendStack);
}

// ========================================
// 9. Observability Stack（監視）
// ========================================
const observabilityStack = new ObservabilityStack(
  app,
  `${config.envName}-ObservabilityStack`,
  config,
  {
    ...stackProps,
    ecsService: backendStack.ecsService,
    rdsCluster: dataStorageStack.auroraCluster,
    rdsInstance: dataStorageStack.rdsInstance,
    lambdaFunction: backendStack.lambdaFunction,
    alb: backendStack.alb,
  }
);
observabilityStack.addDependency(foundationStack);
observabilityStack.addDependency(dataStorageStack);
observabilityStack.addDependency(objectStorageStack);
observabilityStack.addDependency(backendStack);
observabilityStack.addDependency(frontendStack);
observabilityStack.addDependency(integrationStack);
if (batchStack) {
  observabilityStack.addDependency(batchStack);
}

// ========================================
// アプリケーション全体のタグ
// ========================================
cdk.Tags.of(app).add('Project', 'cdk-template');
cdk.Tags.of(app).add('Environment', config.envName);
cdk.Tags.of(app).add('Architecture', 'four-layer');
cdk.Tags.of(app).add('ManagedBy', 'AWS CDK');

const stackCount = config.batch?.enabled ? 9 : 8;
console.log('✅ Stack definitions completed');
console.log(`📦 Stacks: ${stackCount}`);
console.log(`   1. ${config.envName}-FoundationStack`);
console.log(`   2. ${config.envName}-DataStorageStack (DynamoDB + RDS/Aurora)`);
console.log(`   3. ${config.envName}-ObjectStorageStack (S3)`);
console.log(`   4. ${config.envName}-SecurityStack`);
console.log(`   5. ${config.envName}-BackendStack`);
console.log(`   6. ${config.envName}-FrontendStack`);
console.log(`   7. ${config.envName}-IntegrationStack`);
if (config.batch?.enabled) {
  console.log(`   8. ${config.envName}-BatchStack (ECS Scheduled Task)`);
  console.log(`   9. ${config.envName}-ObservabilityStack`);
} else {
  console.log(`   8. ${config.envName}-ObservabilityStack`);
}


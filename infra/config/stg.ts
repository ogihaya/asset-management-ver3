import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { RemovalPolicy } from 'aws-cdk-lib';
import { EnvironmentConfig } from './environment';

/**
 * ステージング環境設定
 */
export const stgConfig: EnvironmentConfig = {
  envName: 'stg',
  account: process.env.CDK_DEFAULT_ACCOUNT || '',
  region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
  removalPolicy: RemovalPolicy.SNAPSHOT, // STGはスナップショット保持

  vpc: {
    cidr: '10.2.0.0/16',
    maxAzs: 2, // STGは2AZ
    natGateways: 2,
  },

  network: {
    cidr: '10.2.0.0/16',
    maxAzs: 2,
    natGateways: 2,
  },

  database: {
    // 💡 ステージング: RDSがデフォルトで有効
    enableDynamo: false, // DynamoDBが必要な場合はtrue
    enableAurora: false, // Auroraが必要な場合はtrue（enableRdsはfalseに）
    enableRds: true, // デフォルト: RDSを使用
    engine: 'postgres',
    instanceType: ec2.InstanceType.of(
      ec2.InstanceClass.T3,
      ec2.InstanceSize.MEDIUM // STGはMedium
    ),
    multiAz: true, // STGは本番同様の構成でテスト
    allocatedStorageGb: 100, // 標準ストレージ
    readerCount: 0, // STGではReaderなし（RDSはMultiAZ構成で冗長化）
    backupRetentionDays: 7,
    autoMinorVersionUpgrade: true, // ステージング環境は自動アップグレード有効
  },

  ecs: {
    backend: {
      cpu: 512,
      memory: 1024,
      desiredCount: 2, // STGは2台構成
      minCount: 2,
      maxCount: 4,
    },
    frontend: {
      cpu: 512,
      memory: 1024,
      desiredCount: 2,
      minCount: 2,
      maxCount: 4,
    },
  },

  frontend: {
    type: 'amplify', // 💡 ステージング: Amplifyで自動デプロイ
    // GitHubリポジトリを設定する場合はコメントを外す
    // repositoryOwner: 'your-org',
    // repositoryName: 'your-repo',
    // mainBranch: 'staging',
    // frontendDirectory: 'frontend',
  },

  // 💡 ステージング環境でもLambdaを無効化（コスト削減、ECSで十分）
  // lambda: {
  //   memorySize: 512,
  //   timeout: 60,
  //   reservedConcurrency: 50,
  // },

  // 💡 Cognito設定
  // SMS認証が必要な場合はコメントを解除
  // cognito: {
  //   enableSmsAuth: true,
  //   smsExternalId: 'MyApp',
  // },

  // 💡 ロギング設定（ステージング環境推奨）
  // 本番同様のログ設定でテスト
  logging: {
    enableAlbLogs: true, // ALBアクセスログ
    retentionDays: 30, // 30日間保持
    glacierTransitionDays: 14, // 14日後にGlacierへ移行
  },

  // 💡 Bastion（踏み台サーバー）設定
  // ステージング環境でもDB接続用に有効化
  bastion: {
    enabled: true,
    enableSsm: true,
    // allowSshFrom: '203.0.113.0/24', // SSH接続が必要な場合
  },

  // 💡 Batch（バッチ処理）設定
  // ステージング環境でバッチ処理をテスト
  // batch: {
  //   enabled: true,
  //   cpu: 512, // 0.5 vCPU
  //   memory: 1024, // 1 GB
  //   useExistingCluster: true,
  // },

  // 💡 SES（メール送信）設定
  // メール送信が必要な場合はコメントを解除
  // ses: {
  //   enabled: true,
  //   identity: 'noreply@example.com',
  //   identityType: 'email',
  //   templates: [
  //     {
  //       templateName: 'welcome-email',
  //       subjectPart: 'ようこそ {{name}} さん',
  //       htmlPart: '<h1>Welcome {{name}}</h1><p>ご登録ありがとうございます。</p>',
  //       textPart: 'Welcome {{name}}\nご登録ありがとうございます。',
  //     },
  //   ],
  // },

  tags: {
    Environment: 'stg',
    Project: 'cdk-template',
    ManagedBy: 'CDK',
    CostCenter: 'staging',
  },
};


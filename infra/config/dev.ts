import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { RemovalPolicy } from 'aws-cdk-lib';
import { EnvironmentConfig } from './environment';

/**
 * 開発環境設定
 */
export const devConfig: EnvironmentConfig = {
  envName: 'dev',
  account: process.env.CDK_DEFAULT_ACCOUNT || '',
  region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
  removalPolicy: RemovalPolicy.DESTROY, // 開発環境は削除可能

  vpc: {
    cidr: '10.0.0.0/16',
    maxAzs: 1, // コスト削減
    natGateways: 1,
  },

  network: {
    cidr: '10.0.0.0/16',
    maxAzs: 1, // コスト削減
    natGateways: 1,
  },

  database: {
    // 💡 開発環境: RDSがデフォルトで有効
    enableDynamo: false, // DynamoDBが必要な場合はtrue
    enableAurora: false, // Auroraが必要な場合はtrue（enableRdsはfalseに）
    enableRds: true, // デフォルト: RDSを使用
    engine: 'postgres',
    instanceType: ec2.InstanceType.of(
      ec2.InstanceClass.T3,
      ec2.InstanceSize.MICRO // 開発環境は最小構成
    ),
    multiAz: false, // 開発環境はシングルAZでコスト削減
    allocatedStorageGb: 20, // 開発環境は最小ストレージ
    readerCount: 0, // 開発環境はWriterのみ
    backupRetentionDays: 3,
    autoMinorVersionUpgrade: true, // 開発環境は自動アップグレード有効
  },

  ecs: {
    backend: {
      cpu: 256,
      memory: 512,
      desiredCount: 1, // 開発環境は最小構成
      minCount: 1,
      maxCount: 2,
    },
    frontend: {
      cpu: 256,
      memory: 512,
      desiredCount: 1,
      minCount: 1,
      maxCount: 2,
    },
  },

  frontend: {
    type: 'amplify', // 💡 開発環境: Amplifyで簡単デプロイ
    // GitHubリポジトリを設定する場合はコメントを外す
    // repositoryOwner: 'your-org',
    // repositoryName: 'your-repo',
    // mainBranch: 'develop',
    // 📁 モノレポの場合はフロントエンドディレクトリを指定
    // frontendDirectory: 'frontend',
  },

  // 💡 開発環境ではLambdaを無効化（コスト削減）
  // Lambda: undefined,

  // 💡 Cognito設定
  // SMS認証が必要な場合はコメントを解除
  // cognito: {
  //   enableSmsAuth: true,
  //   smsExternalId: 'MyApp',
  // },

  // 💡 ロギング設定
  // 開発環境ではログは不要（コスト削減）
  // logging: {
  //   enableAlbLogs: true,
  //   retentionDays: 30,
  // },

  // 💡 Bastion（踏み台サーバー）設定
  // RDS/Auroraに接続する場合は有効化
  bastion: {
    enabled: true, // 開発環境ではデフォルト有効
    enableSsm: true, // SSM Session Manager経由で接続
    // allowSshFrom: '203.0.113.0/24', // SSH接続が必要な場合はオフィスIPを指定
  },

  // 💡 Batch（バッチ処理）設定
  // 定期実行タスクが必要な場合は有効化
  // batch: {
  //   enabled: true,
  //   cpu: 256, // 0.25 vCPU
  //   memory: 512, // 512 MB
  //   useExistingCluster: true, // BackendStackのクラスターを共有
  // },

  // 💡 SES（メール送信）設定
  // メール送信が必要な場合はコメントを解除
  // 注意: 新しいAWSアカウントではサンドボックスモード（検証済みアドレスのみ送信可能）
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
    Environment: 'dev',
    Project: 'cdk-template',
    ManagedBy: 'CDK',
  },
};


import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { RemovalPolicy } from 'aws-cdk-lib';
import { EnvironmentConfig } from '../config/environment';

/**
 * テスト用設定
 * 環境変数に依存せず、固定値を使用
 */
export const testConfig: EnvironmentConfig = {
  envName: 'test',
  account: '123456789012',
  region: 'ap-northeast-1',
  removalPolicy: RemovalPolicy.DESTROY,

  vpc: {
    cidr: '10.0.0.0/16',
    maxAzs: 2,
    natGateways: 1,
  },

  network: {
    cidr: '10.0.0.0/16',
    maxAzs: 2,
    natGateways: 1,
  },

  database: {
    // テスト環境: RDSがデフォルトで有効
    enableDynamo: false,
    enableAurora: false,
    enableRds: true,
    engine: 'postgres',
    instanceType: ec2.InstanceType.of(
      ec2.InstanceClass.T3,
      ec2.InstanceSize.SMALL
    ),
    multiAz: false,
    allocatedStorageGb: 20,
    readerCount: 0,
    backupRetentionDays: 3,
    autoMinorVersionUpgrade: true, // テスト環境は自動アップグレード有効
  },

  ecs: {
    backend: {
      cpu: 256,
      memory: 512,
      desiredCount: 1,
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
    type: 'amplify', // テスト環境もAmplifyをデフォルト
    repositoryOwner: 'test-org',
    repositoryName: 'test-repo',
    mainBranch: 'main',
    frontendDirectory: 'frontend',
  },

  lambda: {
    memorySize: 256,
    timeout: 30,
    reservedConcurrency: 10,
  },

  // テスト環境ではSMS認証は無効
  // SMS認証テストは個別のテストケースで設定をオーバーライド
  // cognito: {
  //   enableSmsAuth: true,
  //   smsExternalId: 'TestApp',
  // },

  // テスト環境ではロギングを有効化（テスト用）
  logging: {
    enableAlbLogs: true,
    retentionDays: 30,
    glacierTransitionDays: 7,
  },

  // テスト環境ではBastionは無効（テスト高速化）
  // Bastionテストは個別のテストケースで設定をオーバーライド
  // bastion: {
  //   enabled: true,
  //   enableSsm: true,
  // },

  // テスト環境ではBatchは無効（テスト高速化）
  // Batchテストは個別のテストケースで設定をオーバーライド
  // batch: {
  //   enabled: true,
  //   cpu: 256,
  //   memory: 512,
  // },

  // テスト環境ではSESは無効（テスト高速化）
  // SESテストは個別のテストケースで設定をオーバーライド
  // ses: {
  //   enabled: true,
  //   identity: 'test@example.com',
  //   identityType: 'email' as const,
  //   templates: [
  //     {
  //       templateName: 'welcome',
  //       subjectPart: 'Welcome {{name}}',
  //       htmlPart: '<h1>Welcome {{name}}</h1>',
  //       textPart: 'Welcome {{name}}',
  //     },
  //   ],
  // },

  tags: {
    Environment: 'test',
    Project: 'cdk-template',
    ManagedBy: 'CDK',
  },
};


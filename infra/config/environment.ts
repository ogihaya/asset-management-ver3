import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { RemovalPolicy } from 'aws-cdk-lib';

/**
 * WAF設定インターフェース
 */
export interface WafConfig {
  /**
   * WAFを有効化するか
   * @default false
   */
  enabled: boolean;
  /**
   * レートリミット（5分間あたりのリクエスト数）
   * @default 2000
   */
  rateLimit?: number;
  /**
   * Bot Control（AWS Managed Rules）を有効化するか
   * 注意: 追加コストが発生します
   * @default false
   */
  enableBotControl?: boolean;
}

/**
 * ロギング設定インターフェース
 */
export interface LoggingConfig {
  /**
   * ALBアクセスログを有効化
   * @default false
   */
  enableAlbLogs?: boolean;
  /**
   * VPC Flow Logsを有効化
   * @default false
   */
  enableVpcFlowLogs?: boolean;
  /**
   * ログの保持期間（日）
   * @default 90
   */
  retentionDays?: number;
  /**
   * Glacierへの移行日数（0で無効）
   * @default 30
   */
  glacierTransitionDays?: number;
}

/**
 * Bastion（踏み台サーバー）設定インターフェース
 */
export interface BastionConfig {
  /**
   * Bastionを有効化するか
   * @default false
   */
  enabled: boolean;
  /**
   * SSH接続を許可するCIDR（セキュリティのため制限推奨）
   * 例: '203.0.113.0/24'（オフィスIP等）
   * 指定しない場合はSSM Session Manager経由のみ
   * @default undefined
   */
  allowSshFrom?: string;
  /**
   * SSM Session Managerを有効化
   * @default true
   */
  enableSsm?: boolean;
}

/**
 * Batch（バッチ処理）設定インターフェース
 */
export interface BatchConfig {
  /**
   * Batchを有効化するか
   * @default false
   */
  enabled: boolean;
  /**
   * タスクのCPU（vCPU単位 × 1024）
   * 256 (.25 vCPU), 512 (.5 vCPU), 1024 (1 vCPU), 2048 (2 vCPU), 4096 (4 vCPU)
   * @default 256
   */
  cpu?: number;
  /**
   * タスクのメモリ（MB）
   * @default 512
   */
  memory?: number;
  /**
   * 既存のECSクラスターを使用するか（BackendStackのクラスター）
   * falseの場合、Batch専用クラスターを作成
   * @default true
   */
  useExistingCluster?: boolean;
}

/**
 * SES（メール送信）設定インターフェース
 */
export interface SesConfig {
  /**
   * SESを有効化するか
   * @default false
   */
  enabled: boolean;
  /**
   * 送信元のメールアドレスまたはドメイン
   * SES有効時は必須
   * 例: 'noreply@example.com' または 'example.com'
   */
  identity?: string;
  /**
   * Identityのタイプ（emailまたはdomain）
   * - email: メールアドレス単位で検証（検証メールが送信される）
   * - domain: ドメイン単位で検証（DNSレコード設定が必要）
   * @default 'email'
   */
  identityType?: 'email' | 'domain';
  /**
   * メールテンプレート定義
   * SESテンプレート変数（{{variable}}）を使用可能
   * @default []
   */
  templates?: Array<{
    /** テンプレート名（環境プレフィックスは自動付与） */
    templateName: string;
    /** メール件名テンプレート */
    subjectPart: string;
    /** HTMLメール本文テンプレート */
    htmlPart?: string;
    /** テキストメール本文テンプレート */
    textPart?: string;
  }>;
}

/**
 * Cognito設定インターフェース
 */
export interface CognitoConfig {
  /**
   * SMS認証を有効化
   * 有効にすると電話番号でのサインイン・MFA・アカウント回復が可能になる
   * 注意: SMS送信にはSNS経由での課金が発生します
   * @default false
   */
  enableSmsAuth?: boolean;
  /**
   * SMS送信者ID（11文字以内の英数字）
   * SMSメッセージの送信元として表示される
   * @default 'MyApp'
   */
  smsExternalId?: string;
}

/**
 * 環境設定インターフェース
 */
export interface EnvironmentConfig {
  /**
   * 環境名 (dev, staging, prod)
   */
  envName: string;

  /**
   * AWSアカウントID
   */
  account: string;

  /**
   * AWSリージョン
   */
  region: string;

  /**
   * 削除ポリシー
   */
  removalPolicy: RemovalPolicy;

  /**
   * VPC設定（networkエイリアス）
   */
  vpc: {
    cidr: string;
    maxAzs: number;
    natGateways: number;
  };

  /**
   * VPC設定（vpcエイリアス）
   */
  network: {
    cidr: string;
    maxAzs: number;
    natGateways: number;
  };

  /**
   * データベース設定
   */
  database: {
    /**
     * DynamoDBを有効化するか
     * @default false
     */
    enableDynamo?: boolean;
    /**
     * Auroraを有効化するか（enableRdsとは排他）
     * @default false
     */
    enableAurora?: boolean;
    /**
     * RDSを有効化するか（enableAuroraとは排他）
     * @default true
     */
    enableRds?: boolean;
    /**
     * エンジンタイプ（RDS/Aurora共通）
     */
    engine: 'postgres' | 'mysql';
    /**
     * インスタンスタイプ
     */
    instanceType: ec2.InstanceType;
    /**
     * マルチAZ配置（RDSのみ有効）
     * @default true
     */
    multiAz: boolean;
    /**
     * ストレージサイズ（GB、RDSのみ有効）
     * @default 100
     */
    allocatedStorageGb: number;
    /**
     * Readerインスタンス数（Auroraのみ有効）
     */
    readerCount: number;
    /**
     * バックアップ保持期間（日）
     */
    backupRetentionDays: number;
    /**
     * 自動マイナーバージョンアップ
     * @default true（開発環境）, false（本番環境）
     */
    autoMinorVersionUpgrade: boolean;
  };

  /**
   * ECS設定
   */
  ecs: {
    backend: {
      cpu: number;
      memory: number;
      desiredCount: number;
      minCount: number;
      maxCount: number;
    };
    frontend: {
      cpu: number;
      memory: number;
      desiredCount: number;
      minCount: number;
      maxCount: number;
    };
  };

  /**
   * フロントエンド設定
   */
  frontend: {
    /**
     * フロントエンドデプロイ方式
     * - 'amplify': AWS Amplify Hosting（デフォルト、簡単）
     * - 's3-cloudfront': S3 + CloudFront（カスタマイズ性高）
     */
    type: 'amplify' | 's3-cloudfront';
    /**
     * GitHubリポジトリオーナー（Amplify使用時）
     */
    repositoryOwner?: string;
    /**
     * GitHubリポジトリ名（Amplify使用時）
     */
    repositoryName?: string;
    /**
     * メインブランチ名（Amplify使用時）
     * @default 'main'
     */
    mainBranch?: string;
    /**
     * フロントエンドディレクトリ（モノレポ用、Amplify使用時）
     * 例: 'frontend', 'apps/web'
     * @default undefined（リポジトリルート）
     */
    frontendDirectory?: string;
    /**
     * GitHubトークンのSecrets Manager名（Amplify使用時）
     * @default 'github-token'
     */
    githubTokenSecretName?: string;
    /**
     * プルリクエストプレビューを有効化（Amplify使用時）
     * @default false
     */
    enablePullRequestPreview?: boolean;
  };

  /**
   * Lambda設定
   * undefinedの場合、Lambdaは作成されません
   */
  lambda?: {
    memorySize: number;
    timeout: number;
    reservedConcurrency: number;
  };

  /**
   * WAF設定（本番環境推奨）
   * ALBとCloudFrontにWAFを適用
   */
  waf?: WafConfig;

  /**
   * Cognito設定
   * SMS認証などの追加機能を設定
   */
  cognito?: CognitoConfig;

  /**
   * ロギング設定
   * ALBアクセスログ、VPC Flow Logsなどの設定
   */
  logging?: LoggingConfig;

  /**
   * Bastion（踏み台サーバー）設定
   * RDS/Auroraへのアクセス用
   */
  bastion?: BastionConfig;

  /**
   * Batch（バッチ処理）設定
   * ECS Scheduled Taskによる定期実行
   */
  batch?: BatchConfig;

  /**
   * SES（メール送信）設定
   * メール送信機能が必要な場合に設定
   * 注意: 新しいAWSアカウントではSESサンドボックスモード。本番利用にはサンドボックス解除申請が必要
   */
  ses?: SesConfig;

  /**
   * タグ設定
   */
  tags: {
    [key: string]: string;
  };
}


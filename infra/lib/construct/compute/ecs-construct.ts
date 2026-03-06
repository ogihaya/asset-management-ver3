import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface EcsConstructProps {
  /**
   * クラスター名
   */
  clusterName: string;
  /**
   * VPC
   */
  vpc: ec2.IVpc;
  /**
   * Container Insights有効化
   * @default true
   */
  containerInsights?: boolean;
}

/**
 * レイヤー1: ECSクラスターConstruct（単一リソース）
 * 
 * 責務: 単一のECSクラスターをセキュアなデフォルト設定で抽象化
 * - Container Insightsの有効化
 * - VPCベースの配置
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class EcsConstruct extends Construct {
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: EcsConstructProps) {
    super(scope, id);

    // ECS Cluster（L2コンストラクト）
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: props.clusterName,
      vpc: props.vpc,
      containerInsights: props.containerInsights !== false, // デフォルトtrue
    });
  }
}

export interface FargateServiceConstructProps {
  /**
   * サービス名
   */
  serviceName: string;
  /**
   * ECSクラスター
   */
  cluster: ecs.ICluster;
  /**
   * タスク定義
   */
  taskDefinition: ecs.FargateTaskDefinition;
  /**
   * 希望するタスク数
   * @default 2
   */
  desiredCount?: number;
  /**
   * サブネット選択
   */
  vpcSubnets?: ec2.SubnetSelection;
  /**
   * セキュリティグループ
   */
  securityGroups?: ec2.ISecurityGroup[];
}

/**
 * レイヤー1: Fargate ServiceConstruct（単一リソース）
 * 
 * 責務: 単一のFargateサービスをセキュアなデフォルト設定で抽象化
 * - マルチAZ配置
 * - ヘルスチェック統合
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class FargateServiceConstruct extends Construct {
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: FargateServiceConstructProps) {
    super(scope, id);

    // Fargate Service（L2コンストラクト）
    this.service = new ecs.FargateService(this, 'Service', {
      serviceName: props.serviceName,
      cluster: props.cluster,
      taskDefinition: props.taskDefinition,
      desiredCount: props.desiredCount || 2,
      vpcSubnets: props.vpcSubnets || {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: props.securityGroups,
      assignPublicIp: false, // セキュリティのためプライベート配置
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
    });
  }
}

export interface FargateTaskDefinitionConstructProps {
  /**
   * ファミリー名
   */
  family: string;
  /**
   * CPU（256, 512, 1024, 2048, 4096）
   * @default 256
   */
  cpu?: number;
  /**
   * メモリ（MB: 512, 1024, 2048, 4096, 8192...）
   * @default 512
   */
  memoryLimitMiB?: number;
}

/**
 * レイヤー1: Fargate TaskDefinitionConstruct（単一リソース）
 * 
 * 責務: 単一のFargateタスク定義を作成
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class FargateTaskDefinitionConstruct extends Construct {
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  constructor(scope: Construct, id: string, props: FargateTaskDefinitionConstructProps) {
    super(scope, id);

    // Fargate TaskDefinition（L2コンストラクト）
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      family: props.family,
      cpu: props.cpu || 256,
      memoryLimitMiB: props.memoryLimitMiB || 512,
    });
  }

  /**
   * コンテナを追加
   *
   * 環境変数の管理方針:
   * - 非機密情報: environmentFiles（S3）またはenvironment（タスク定義）
   * - 機密情報: secrets（Secrets Manager）
   *
   * @param id コンテナID
   * @param options コンテナオプション
   * @param options.image コンテナイメージ
   * @param options.logging ログドライバー
   * @param options.environment 非機密環境変数（タスク定義に平文保存、非推奨）
   * @param options.environmentFiles S3からの環境変数ファイル（推奨）
   * @param options.secrets Secrets Managerからの機密情報
   * @param options.portMappings ポートマッピング
   */
  addContainer(
    id: string,
    options: {
      image: ecs.ContainerImage;
      logging?: ecs.LogDriver;
      environment?: { [key: string]: string };
      environmentFiles?: ecs.EnvironmentFile[];
      secrets?: { [key: string]: ecs.Secret };
      portMappings?: ecs.PortMapping[];
    }
  ): ecs.ContainerDefinition {
    return this.taskDefinition.addContainer(id, {
      image: options.image,
      logging: options.logging,
      environment: options.environment,
      environmentFiles: options.environmentFiles,
      secrets: options.secrets,
      portMappings: options.portMappings,
    });
  }

  /**
   * S3から環境変数ファイルを読み込むためのEnvironmentFileを作成
   *
   * @param bucket S3バケット
   * @param key S3オブジェクトキー（例: "config/app.env"）
   */
  static environmentFileFromS3(bucket: s3.IBucket, key: string): ecs.EnvironmentFile {
    return ecs.EnvironmentFile.fromBucket(bucket, key);
  }
}


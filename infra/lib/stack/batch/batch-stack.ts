import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../../config/environment';
import {
  EcsConstruct,
  FargateTaskDefinitionConstruct,
} from '../../construct/compute/ecs-construct';
import {
  ScheduledTaskConstruct,
  CommonSchedules,
} from '../../construct/compute/scheduled-task-construct';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';

/**
 * 環境名に基づいてログ保持期間を取得
 */
function getRetentionDays(envName: string): logs.RetentionDays {
  switch (envName) {
    case 'prod':
      return logs.RetentionDays.THREE_MONTHS;
    case 'stg':
      return logs.RetentionDays.ONE_MONTH;
    case 'dev':
    default:
      return logs.RetentionDays.ONE_WEEK;
  }
}

export interface BatchStackProps extends cdk.StackProps {
  /**
   * VPC（FoundationStackから渡される）
   */
  vpc: ec2.IVpc;
  /**
   * ECSクラスター（BackendStackから渡される、または新規作成）
   */
  ecsCluster?: ecs.ICluster;
  /**
   * データベースセキュリティグループ（DataStorageStackから渡される）
   */
  databaseSecurityGroup?: ec2.ISecurityGroup;
}

/**
 * レイヤー3: Batch Stack（バッチ処理スタック）
 *
 * 責務: 定期実行・バッチ処理の提供
 * - ECS Scheduled Task
 * - EventBridge スケジュール
 * - CloudWatch Logs
 *
 * 含まれるリソース:
 * - ECS Task Definition（バッチ用）
 * - EventBridge Rule（スケジュール）
 * - CloudWatch Log Group
 *
 * 変更頻度: 月1回（バッチ追加・変更）
 * デプロイ時間: 約3-5分
 *
 * 分離理由:
 * - バッチ処理は独立してデプロイ可能
 * - スケジュール変更が頻繁に発生する可能性
 * - バックエンドAPIとは異なるライフサイクル
 */
export class BatchStack extends cdk.Stack {
  public readonly cluster: ecs.ICluster;
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly logGroup: logs.LogGroup;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(
    scope: Construct,
    id: string,
    config: EnvironmentConfig,
    props: BatchStackProps
  ) {
    super(scope, id, props);

    // バッチ設定（デフォルト値適用）
    const batchConfig = config.batch ?? {
      enabled: false,
      cpu: 256,
      memory: 512,
    };

    // CloudWatch Logs
    this.logGroup = new logs.LogGroup(this, 'BatchLogGroup', {
      logGroupName: `/ecs/${config.envName}/batch`,
      retention: getRetentionDays(config.envName),
      removalPolicy: config.removalPolicy,
    });

    // セキュリティグループ
    this.securityGroup = new ec2.SecurityGroup(this, 'BatchSecurityGroup', {
      vpc: props.vpc,
      description: `Security group for ${config.envName} batch tasks`,
      allowAllOutbound: true,
    });

    // ECSクラスター（既存または新規作成）
    if (props.ecsCluster) {
      this.cluster = props.ecsCluster;
    } else {
      const ecsConstruct = new EcsConstruct(this, 'BatchCluster', {
        clusterName: `${config.envName}-batch-cluster`,
        vpc: props.vpc,
        containerInsights: config.envName === 'prod',
      });
      this.cluster = ecsConstruct.cluster;
    }

    // タスク定義（設定から取得）
    const taskDefConstruct = new FargateTaskDefinitionConstruct(
      this,
      'BatchTaskDef',
      {
        family: `${config.envName}-batch`,
        cpu: batchConfig.cpu ?? 256,
        memoryLimitMiB: batchConfig.memory ?? 512,
      }
    );
    this.taskDefinition = taskDefConstruct.taskDefinition;

    // コンテナ定義（プレースホルダー）
    // 実際の運用では、ECRからイメージを取得するように変更
    taskDefConstruct.addContainer('batch', {
      image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'batch',
        logGroup: this.logGroup,
      }),
      environment: {
        ENV: config.envName,
      },
    });

    // データベースへのアクセス許可（PostgreSQL: 5432）
    if (props.databaseSecurityGroup) {
      props.databaseSecurityGroup.addIngressRule(
        this.securityGroup,
        ec2.Port.tcp(5432),
        'Allow PostgreSQL access from Batch tasks'
      );
    }

    // サンプルスケジュールタスク（毎日午前3時 JST）
    // 初期状態は無効、必要に応じて有効化
    new ScheduledTaskConstruct(this, 'DailyBatch', {
      ruleName: `${config.envName}-daily-batch`,
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      schedule: CommonSchedules.dailyAt3amJst(),
      securityGroups: [this.securityGroup],
      enabled: false, // 初期状態は無効（手動で有効化）
      description: `Daily batch job for ${config.envName} environment`,
    });

    // タグ付け
    cdk.Tags.of(this).add('Environment', config.envName);
    cdk.Tags.of(this).add('Project', config.tags.Project);
    cdk.Tags.of(this).add('ManagedBy', config.tags.ManagedBy);
    cdk.Tags.of(this).add('Layer', 'Batch');

    // Outputs
    new cdk.CfnOutput(this, 'BatchClusterName', {
      value: this.cluster.clusterName,
      description: 'Batch ECS Cluster Name',
      exportName: `${config.envName}-BatchClusterName`,
    });

    new cdk.CfnOutput(this, 'BatchTaskDefinitionArn', {
      value: this.taskDefinition.taskDefinitionArn,
      description: 'Batch Task Definition ARN',
      exportName: `${config.envName}-BatchTaskDefinitionArn`,
    });

    new cdk.CfnOutput(this, 'BatchLogGroupName', {
      value: this.logGroup.logGroupName,
      description: 'Batch Log Group Name',
      exportName: `${config.envName}-BatchLogGroupName`,
    });

    new cdk.CfnOutput(this, 'BatchSecurityGroupId', {
      value: this.securityGroup.securityGroupId,
      description: 'Batch Security Group ID',
      exportName: `${config.envName}-BatchSecurityGroupId`,
    });

    console.log(`✅ Batch Stack created: ${config.envName}`);
    console.log(`   Task CPU: ${batchConfig.cpu ?? 256}, Memory: ${batchConfig.memory ?? 512}MB`);
    console.log(`   Daily batch schedule: 03:00 JST (disabled by default)`);
  }
}

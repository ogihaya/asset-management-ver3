import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

export interface AuroraConstructProps {
  /**
   * クラスター名
   */
  clusterName: string;
  /**
   * VPC
   */
  vpc: ec2.IVpc;
  /**
   * データベース名
   * @default 'main'
   */
  defaultDatabaseName?: string;
  /**
   * インスタンス数
   * @default 1
   */
  instances?: number;
  /**
   * インスタンスタイプ
   * @default t3.medium
   */
  instanceType?: ec2.InstanceType;
  /**
   * バックアップ保持期間（日）
   * @default 7
   */
  backupRetentionDays?: number;
  /**
   * 削除ポリシー
   * @default DESTROY（開発環境）
   */
  removalPolicy?: RemovalPolicy;
  /**
   * 自動マイナーバージョンアップ
   * @default true
   */
  autoMinorVersionUpgrade?: boolean;
}

/**
 * レイヤー1: Aurora PostgreSQLクラスターConstruct（単一リソース）
 * 
 * 責務: 単一のAurora PostgreSQLクラスターをセキュアなデフォルト設定で抽象化
 * - デフォルトで暗号化、バックアップ有効
 * - VPCプライベートサブネット配置
 * - マルチAZ対応
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class AuroraConstruct extends Construct {
  public readonly cluster: rds.DatabaseCluster;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: AuroraConstructProps) {
    super(scope, id);

    // セキュリティグループ
    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      description: `Security group for ${props.clusterName}`,
      allowAllOutbound: true,
    });

    // autoMinorVersionUpgradeのデフォルト値
    const autoMinorVersionUpgrade = props.autoMinorVersionUpgrade ?? true;

    // Aurora PostgreSQL Cluster（L2コンストラクト）
    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      clusterIdentifier: props.clusterName,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      writer: rds.ClusterInstance.provisioned('writer', {
        instanceType: props.instanceType || ec2.InstanceType.of(
          ec2.InstanceClass.T3,
          ec2.InstanceSize.MEDIUM
        ),
        autoMinorVersionUpgrade,
      }),
      readers: props.instances && props.instances > 1
        ? [
            rds.ClusterInstance.provisioned('reader', {
              instanceType: props.instanceType || ec2.InstanceType.of(
                ec2.InstanceClass.T3,
                ec2.InstanceSize.MEDIUM
              ),
              autoMinorVersionUpgrade,
            }),
          ]
        : undefined,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.securityGroup],
      defaultDatabaseName: props.defaultDatabaseName || 'main',
      // セキュアなデフォルト設定
      backup: {
        retention: Duration.days(props.backupRetentionDays || 7),
      },
      storageEncrypted: true, // 暗号化
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
    });
  }

  /**
   * 指定されたセキュリティグループからのアクセスを許可
   */
  allowConnectionsFrom(securityGroup: ec2.ISecurityGroup): void {
    this.securityGroup.addIngressRule(
      securityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access'
    );
  }
}


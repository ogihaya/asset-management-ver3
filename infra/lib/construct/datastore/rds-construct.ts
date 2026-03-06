import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

export enum RdsEngineType {
  MYSQL = 'mysql',
  POSTGRES = 'postgres',
  MARIADB = 'mariadb',
  SQL_SERVER = 'sqlserver',
  ORACLE = 'oracle',
}

export interface RdsConstructProps {
  /**
   * インスタンス名
   */
  instanceName: string;
  /**
   * VPC
   */
  vpc: ec2.IVpc;
  /**
   * エンジンタイプ
   * @default POSTGRES
   */
  engineType?: RdsEngineType;
  /**
   * データベース名
   * @default 'main'
   */
  defaultDatabaseName?: string;
  /**
   * インスタンスタイプ
   * @default t3.medium
   */
  instanceType?: ec2.InstanceType;
  /**
   * ストレージサイズ（GB）
   * @default 100
   */
  allocatedStorageGb?: number;
  /**
   * マルチAZ配置
   * @default true
   */
  multiAz?: boolean;
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
   * パブリックアクセス
   * @default false
   */
  publiclyAccessible?: boolean;
  /**
   * 自動マイナーバージョンアップ
   * @default true
   */
  autoMinorVersionUpgrade?: boolean;
  /**
   * データベースのマスターユーザー名
   * @default 'app_user'
   */
  masterUsername?: string;
  /**
   * RDSインスタンスのサブネットタイプ
   * @default PRIVATE_WITH_EGRESS
   */
  subnetType?: ec2.SubnetType;
}

/**
 * レイヤー1: RDSインスタンスConstruct（単一リソース）
 * 
 * 責務: 単一のRDSインスタンスをセキュアなデフォルト設定で抽象化
 * - デフォルトで暗号化、バックアップ有効
 * - VPCプライベートサブネット配置
 * - マルチAZ対応
 * - 複数のエンジンタイプ対応（MySQL、PostgreSQL、MariaDB等）
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class RdsConstruct extends Construct {
  public readonly instance: rds.DatabaseInstance;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: RdsConstructProps) {
    super(scope, id);

    // セキュリティグループ
    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      description: `Security group for ${props.instanceName}`,
      allowAllOutbound: true,
    });

    // エンジンの選択
    const engine = this.getEngine(props.engineType || RdsEngineType.POSTGRES);

    // RDS Instance（L2コンストラクト）
    this.instance = new rds.DatabaseInstance(this, 'Instance', {
      instanceIdentifier: props.instanceName,
      engine: engine,
      instanceType: props.instanceType || ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MEDIUM
      ),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: props.subnetType || ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.securityGroup],
      credentials: rds.Credentials.fromGeneratedSecret(
        props.masterUsername || 'app_user'
      ),
      databaseName: props.defaultDatabaseName || 'main',
      allocatedStorage: props.allocatedStorageGb || 100,
      multiAz: props.multiAz !== undefined ? props.multiAz : true,
      publiclyAccessible: props.publiclyAccessible || false,
      // セキュアなデフォルト設定
      backupRetention: Duration.days(props.backupRetentionDays || 7),
      storageEncrypted: true, // 暗号化
      deleteAutomatedBackups: false, // バックアップを保持
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
      deletionProtection: false, // 本番環境ではtrueに変更を推奨
      autoMinorVersionUpgrade: props.autoMinorVersionUpgrade ?? true,
    });
  }

  /**
   * エンジンタイプに応じたエンジンインスタンスを返す
   */
  private getEngine(engineType: RdsEngineType): rds.IInstanceEngine {
    switch (engineType) {
      case RdsEngineType.MYSQL:
        return rds.DatabaseInstanceEngine.mysql({
          version: rds.MysqlEngineVersion.VER_8_0_35,
        });
      case RdsEngineType.POSTGRES:
        return rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_15,
        });
      case RdsEngineType.MARIADB:
        return rds.DatabaseInstanceEngine.mariaDb({
          version: rds.MariaDbEngineVersion.VER_10_11_6,
        });
      case RdsEngineType.SQL_SERVER:
        return rds.DatabaseInstanceEngine.sqlServerEx({
          version: rds.SqlServerEngineVersion.VER_15_00_4335_1_V1,
        });
      case RdsEngineType.ORACLE:
        return rds.DatabaseInstanceEngine.oracleEe({
          version: rds.OracleEngineVersion.VER_19_0_0_0_2023_04_R1,
        });
      default:
        return rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_15,
        });
    }
  }

  /**
   * エンジンタイプに応じたポート番号を返す
   */
  private getPort(engineType: RdsEngineType): number {
    switch (engineType) {
      case RdsEngineType.MYSQL:
        return 3306;
      case RdsEngineType.POSTGRES:
        return 5432;
      case RdsEngineType.MARIADB:
        return 3306;
      case RdsEngineType.SQL_SERVER:
        return 1433;
      case RdsEngineType.ORACLE:
        return 1521;
      default:
        return 5432;
    }
  }

  /**
   * 指定されたセキュリティグループからのアクセスを許可
   */
  allowConnectionsFrom(
    securityGroup: ec2.ISecurityGroup,
    engineType?: RdsEngineType
  ): void {
    const port = this.getPort(engineType || RdsEngineType.POSTGRES);
    this.securityGroup.addIngressRule(
      securityGroup,
      ec2.Port.tcp(port),
      `Allow database access on port ${port}`
    );
  }
}


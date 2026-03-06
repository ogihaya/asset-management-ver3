import { Construct } from 'constructs';
import { DynamoDbConstruct } from '../construct/datastore/dynamodb-construct';
import { AuroraConstruct } from '../construct/datastore/aurora-construct';
import { RdsConstruct, RdsEngineType } from '../construct/datastore/rds-construct';
import { S3Construct } from '../construct/datastore/s3-construct';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface DatabaseResourceProps {
  /**
   * DynamoDBを有効化するか
   * @default false
   */
  enableDynamo?: boolean;
  /**
   * DynamoDBテーブル名（enableDynamo=trueの場合に使用）
   */
  dynamoTableName?: string;
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
   * エンジンタイプ
   * @default 'postgres'
   */
  engineType?: 'postgres' | 'mysql';
  /**
   * データベース名（Aurora/RDS共通）
   */
  databaseName?: string;
  /**
   * Auroraクラスター名（databaseType='aurora'の場合に使用）
   */
  auroraClusterName?: string;
  /**
   * RDSインスタンス名（databaseType='rds'の場合に使用）
   */
  rdsInstanceName?: string;
  /**
   * インスタンスタイプ
   */
  instanceType?: ec2.InstanceType;
  /**
   * マルチAZ配置（RDSのみ）
   * @default true
   */
  multiAz?: boolean;
  /**
   * ストレージサイズ（GB、RDSのみ）
   * @default 100
   */
  allocatedStorageGb?: number;
  /**
   * Readerインスタンス数（Auroraのみ）
   * @default 0
   */
  readerCount?: number;
  /**
   * バックアップ保持期間（日）
   * @default 7
   */
  backupRetentionDays?: number;
  /**
   * S3バケット名
   */
  s3BucketName: string;
  /**
   * VPC
   */
  vpc: ec2.IVpc;
  /**
   * 削除ポリシー
   * @default DESTROY（開発環境）
   */
  removalPolicy?: RemovalPolicy;
}

/**
 * レイヤー2: データベースResource（機能単位）
 * 
 * 責務: データストレージ全体を提供
 * - DynamoDB（NoSQL）
 * - RDS/Aurora（RDB） - 選択可能
 * - S3（オブジェクトストレージ）
 * 
 * 含まれるConstruct: DynamoDbConstruct, RdsConstruct, AuroraConstruct, S3Construct
 * 
 * 変更頻度: まれ（テンプレートの改善時）
 */
export class DatabaseResource extends Construct {
  public readonly dynamoTable?: dynamodb.Table;
  public readonly auroraCluster?: rds.DatabaseCluster;
  public readonly rdsInstance?: rds.DatabaseInstance;
  public readonly s3Bucket: s3.Bucket;
  public readonly databaseSecurityGroup?: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseResourceProps) {
    super(scope, id);

    // デフォルト値: RDSが有効、DynamoDB/Auroraは無効
    const enableDynamo = props.enableDynamo ?? false;
    const enableAurora = props.enableAurora ?? false;
    const enableRds = props.enableRds ?? true;
    const engineType = props.engineType || 'postgres';

    // DynamoDBの作成（オプション）
    if (enableDynamo) {
      if (!props.dynamoTableName) {
        throw new Error('dynamoTableName is required when enableDynamo is true');
      }
      const dynamoConstruct = new DynamoDbConstruct(this, 'DynamoConstruct', {
        tableName: props.dynamoTableName,
        removalPolicy: props.removalPolicy,
      });
      this.dynamoTable = dynamoConstruct.table;
      console.log('✅ DynamoDB table created');
    } else {
      console.log('ℹ️  DynamoDB not created (enableDynamo: false)');
    }

    // RDB（Aurora/RDS）の作成
    if (enableAurora) {
      // Aurora PostgreSQL/MySQLの作成
      const auroraConstruct = new AuroraConstruct(this, 'AuroraConstruct', {
        clusterName: props.auroraClusterName || 'aurora-cluster',
        vpc: props.vpc,
        defaultDatabaseName: props.databaseName,
        instanceType: props.instanceType,
        instances: (props.readerCount || 0) + 1, // Writer + Readers
        backupRetentionDays: props.backupRetentionDays,
        removalPolicy: props.removalPolicy,
      });
      this.auroraCluster = auroraConstruct.cluster;
      this.databaseSecurityGroup = auroraConstruct.securityGroup;

      console.log(`✅ Aurora ${engineType.toUpperCase()} cluster created`);
    } else if (enableRds) {
      // RDS PostgreSQL/MySQLの作成（デフォルト）
      const rdsEngineType = engineType === 'mysql' ? RdsEngineType.MYSQL : RdsEngineType.POSTGRES;
      const rdsConstruct = new RdsConstruct(this, 'RdsConstruct', {
        instanceName: props.rdsInstanceName || 'rds-instance',
        vpc: props.vpc,
        engineType: rdsEngineType,
        defaultDatabaseName: props.databaseName,
        instanceType: props.instanceType,
        allocatedStorageGb: props.allocatedStorageGb,
        multiAz: props.multiAz,
        backupRetentionDays: props.backupRetentionDays,
        removalPolicy: props.removalPolicy,
        publiclyAccessible: false,
      });
      this.rdsInstance = rdsConstruct.instance;
      this.databaseSecurityGroup = rdsConstruct.securityGroup;

      console.log(`✅ RDS ${engineType.toUpperCase()} instance created (MultiAZ: ${props.multiAz !== false})`);
    } else {
      console.log('ℹ️  RDB not created (enableRds: false, enableAurora: false)');
    }

    // S3バケットの作成
    const s3Construct = new S3Construct(this, 'S3Construct', {
      bucketName: props.s3BucketName,
      removalPolicy: props.removalPolicy,
    });
    this.s3Bucket = s3Construct.bucket;
  }

  /**
   * データベースのエンドポイントを取得
   */
  getDatabaseEndpoint(): string | undefined {
    if (this.auroraCluster) {
      return this.auroraCluster.clusterEndpoint.hostname;
    }
    if (this.rdsInstance) {
      return this.rdsInstance.instanceEndpoint.hostname;
    }
    return undefined;
  }

  /**
   * データベースのポート番号を取得
   */
  getDatabasePort(): number | undefined {
    if (this.auroraCluster) {
      return this.auroraCluster.clusterEndpoint.port;
    }
    if (this.rdsInstance) {
      return this.rdsInstance.instanceEndpoint.port;
    }
    return undefined;
  }

  /**
   * 指定されたセキュリティグループからのデータベースアクセスを許可
   */
  allowConnectionsFrom(securityGroup: ec2.ISecurityGroup): void {
    if (!this.databaseSecurityGroup) {
      console.log('ℹ️  No database security group to configure');
      return;
    }

    const port = this.getDatabasePort() || 5432;
    this.databaseSecurityGroup.addIngressRule(
      securityGroup,
      ec2.Port.tcp(port),
      `Allow database access from ${securityGroup.securityGroupId}`
    );
  }
}


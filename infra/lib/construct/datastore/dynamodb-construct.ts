import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface DynamoDbConstructProps {
  /**
   * テーブル名
   */
  tableName: string;
  /**
   * パーティションキー名
   * @default 'id'
   */
  partitionKey?: string;
  /**
   * ソートキー名（オプション）
   */
  sortKey?: string;
  /**
   * Point-in-Time Recovery有効化
   * @default true
   */
  pointInTimeRecovery?: boolean;
  /**
   * 削除ポリシー
   * @default DESTROY（開発環境）
   */
  removalPolicy?: RemovalPolicy;
}

/**
 * レイヤー1: DynamoDBテーブルConstruct（単一リソース）
 * 
 * 責務: 単一のDynamoDBテーブルをセキュアなデフォルト設定で抽象化
 * - デフォルトで暗号化、バックアップ有効
 * - オンデマンド課金
 * - Point-in-Time Recovery
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class DynamoDbConstruct extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDbConstructProps) {
    super(scope, id);

    // DynamoDB Table（L2コンストラクト）
    this.table = new dynamodb.Table(this, 'Table', {
      tableName: props.tableName,
      partitionKey: {
        name: props.partitionKey || 'id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: props.sortKey
        ? {
            name: props.sortKey,
            type: dynamodb.AttributeType.STRING,
          }
        : undefined,
      // セキュアなデフォルト設定
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // オンデマンド課金
      encryption: dynamodb.TableEncryption.AWS_MANAGED, // 暗号化
      pointInTimeRecovery: props.pointInTimeRecovery !== false, // PITR有効
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY, // 開発環境用
    });
  }

  /**
   * グローバルセカンダリインデックスを追加
   */
  addGlobalSecondaryIndex(props: {
    indexName: string;
    partitionKey: { name: string; type: dynamodb.AttributeType };
    sortKey?: { name: string; type: dynamodb.AttributeType };
  }): void {
    this.table.addGlobalSecondaryIndex({
      indexName: props.indexName,
      partitionKey: props.partitionKey,
      sortKey: props.sortKey,
    });
  }
}


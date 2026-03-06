import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Duration } from 'aws-cdk-lib';

export interface SqsConstructProps {
  /**
   * キュー名
   */
  queueName: string;
  /**
   * メッセージ保持期間（秒）
   * @default 14日
   */
  retentionPeriod?: number;
  /**
   * Visibility Timeout（秒）
   * @default 30
   */
  visibilityTimeout?: number;
  /**
   * Dead Letter Queue
   */
  deadLetterQueue?: {
    queue: sqs.IQueue;
    maxReceiveCount: number;
  };
}

/**
 * レイヤー1: SQSキューConstruct（単一リソース）
 * 
 * 責務: 単一のSQSキューをセキュアなデフォルト設定で抽象化
 * - DLQ対応
 * - 暗号化有効
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class SqsConstruct extends Construct {
  public readonly queue: sqs.Queue;

  constructor(scope: Construct, id: string, props: SqsConstructProps) {
    super(scope, id);

    // SQS Queue（L2コンストラクト）
    this.queue = new sqs.Queue(this, 'Queue', {
      queueName: props.queueName,
      retentionPeriod: Duration.days(props.retentionPeriod || 14),
      visibilityTimeout: Duration.seconds(props.visibilityTimeout || 30),
      deadLetterQueue: props.deadLetterQueue,
      encryption: sqs.QueueEncryption.SQS_MANAGED, // 暗号化
    });
  }
}


import { Construct } from 'constructs';
import { SnsConstruct } from '../construct/messaging/sns-construct';
import { SqsConstruct } from '../construct/messaging/sqs-construct';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

export interface MessagingResourceProps {
  /**
   * SNSトピック名
   */
  topicName: string;
  /**
   * SQSキュー名
   */
  queueName: string;
  /**
   * DLQキュー名
   */
  dlqName: string;
}

/**
 * レイヤー2: メッセージングResource（機能単位）
 * 
 * 責務: メッセージング基盤全体を提供
 * - SNS Topic（Pub/Sub）
 * - SQS Queue（メッセージキュー）
 * - Dead Letter Queue（失敗メッセージ処理）
 * 
 * 含まれるConstruct: SnsConstruct, SqsConstruct
 * 
 * 変更頻度: まれ（テンプレートの改善時）
 */
export class MessagingResource extends Construct {
  public readonly topic: sns.Topic;
  public readonly queue: sqs.Queue;
  public readonly deadLetterQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: MessagingResourceProps) {
    super(scope, id);

    // Dead Letter Queueの作成
    const dlqConstruct = new SqsConstruct(this, 'DlqConstruct', {
      queueName: props.dlqName,
    });
    this.deadLetterQueue = dlqConstruct.queue;

    // SQS Queueの作成
    const queueConstruct = new SqsConstruct(this, 'QueueConstruct', {
      queueName: props.queueName,
      deadLetterQueue: {
        queue: this.deadLetterQueue,
        maxReceiveCount: 3,
      },
    });
    this.queue = queueConstruct.queue;

    // SNS Topicの作成
    const topicConstruct = new SnsConstruct(this, 'TopicConstruct', {
      topicName: props.topicName,
    });
    this.topic = topicConstruct.topic;

    // SNSとSQSを連携
    this.topic.addSubscription(new subscriptions.SqsSubscription(this.queue));
  }

  /**
   * Lambdaサブスクリプションを追加
   */
  addLambdaSubscription(lambdaFunction: any): void {
    this.topic.addSubscription(
      new subscriptions.LambdaSubscription(lambdaFunction)
    );
  }
}


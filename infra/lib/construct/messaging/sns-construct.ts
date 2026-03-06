import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';

export interface SnsConstructProps {
  /**
   * トピック名
   */
  topicName: string;
  /**
   * 表示名
   */
  displayName?: string;
}

/**
 * レイヤー1: SNSトピックConstruct（単一リソース）
 * 
 * 責務: 単一のSNSトピックをセキュアなデフォルト設定で抽象化
 * - パブリッシュ/サブスクライブ機能
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class SnsConstruct extends Construct {
  public readonly topic: sns.Topic;

  constructor(scope: Construct, id: string, props: SnsConstructProps) {
    super(scope, id);

    // SNS Topic（L2コンストラクト）
    this.topic = new sns.Topic(this, 'Topic', {
      topicName: props.topicName,
      displayName: props.displayName || props.topicName,
    });
  }
}


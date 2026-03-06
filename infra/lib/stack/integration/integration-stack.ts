import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../../config/environment';
import { MessagingResource } from '../../resource/messaging-resource';
import { EmailResource } from '../../resource/email-resource';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ses from 'aws-cdk-lib/aws-ses';

export interface IntegrationStackProps extends cdk.StackProps {}

/**
 * レイヤー3: Integration Stack（統合スタック）
 *
 * 責務: システム間連携の提供
 * - SNS Topic（イベント通知）
 * - SQS Queue（メッセージキュー）
 * - Dead Letter Queue
 * - SES Email Identity（メール送信）
 * - SES Email Templates（メールテンプレート）
 *
 * 含まれるResource: MessagingResource, EmailResource
 *
 * 変更頻度: 月1回（連携パターン追加）
 * デプロイ時間: 約2-3分
 */
export class IntegrationStack extends cdk.Stack {
  public readonly topic: sns.Topic;
  public readonly queue: sqs.Queue;
  public readonly deadLetterQueue: sqs.Queue;
  public readonly emailIdentity?: ses.EmailIdentity;
  public readonly emailTemplates?: ses.CfnTemplate[];

  constructor(
    scope: Construct,
    id: string,
    config: EnvironmentConfig,
    props?: IntegrationStackProps
  ) {
    super(scope, id, props);

    // メッセージングリソースの作成（Resource層を使用）
    const messagingResource = new MessagingResource(this, 'MessagingResource', {
      topicName: `${config.envName}-cdk-template-topic`,
      queueName: `${config.envName}-cdk-template-queue`,
      dlqName: `${config.envName}-cdk-template-dlq`,
    });

    this.topic = messagingResource.topic;
    this.queue = messagingResource.queue;
    this.deadLetterQueue = messagingResource.deadLetterQueue;

    // メールリソースの作成（SES有効時のみ）
    if (config.ses?.enabled && config.ses.identity) {
      const emailResource = new EmailResource(this, 'EmailResource', {
        identityValue: config.ses.identity,
        identityType: config.ses.identityType,
        templates: config.ses.templates?.map(t => ({
          templateName: `${config.envName}-cdk-template-${t.templateName}`,
          subjectPart: t.subjectPart,
          htmlPart: t.htmlPart,
          textPart: t.textPart,
        })),
      });

      this.emailIdentity = emailResource.emailIdentity;
      this.emailTemplates = emailResource.templates;

      // SES Outputs
      new cdk.CfnOutput(this, 'SesIdentity', {
        value: config.ses.identity,
        description: 'SES Email Identity',
        exportName: `${config.envName}-SesIdentity`,
      });
    }

    // タグ付け
    cdk.Tags.of(this).add('Environment', config.envName);
    cdk.Tags.of(this).add('Project', config.tags.Project);
    cdk.Tags.of(this).add('ManagedBy', config.tags.ManagedBy);

    // Outputs
    new cdk.CfnOutput(this, 'TopicArn', {
      value: this.topic.topicArn,
      description: 'SNS Topic ARN',
      exportName: `${config.envName}-TopicArn`,
    });

    new cdk.CfnOutput(this, 'QueueUrl', {
      value: this.queue.queueUrl,
      description: 'SQS Queue URL',
      exportName: `${config.envName}-QueueUrl`,
    });

    new cdk.CfnOutput(this, 'DlqUrl', {
      value: this.deadLetterQueue.queueUrl,
      description: 'Dead Letter Queue URL',
      exportName: `${config.envName}-DlqUrl`,
    });
  }
}

import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export interface ScheduledTaskConstructProps {
  /**
   * ルール名
   */
  ruleName: string;
  /**
   * ECSクラスター
   */
  cluster: ecs.ICluster;
  /**
   * タスク定義
   */
  taskDefinition: ecs.FargateTaskDefinition;
  /**
   * スケジュール（cron or rate）
   */
  schedule: events.Schedule;
  /**
   * サブネット選択
   * @default PRIVATE_WITH_EGRESS
   */
  subnetSelection?: ec2.SubnetSelection;
  /**
   * セキュリティグループ
   */
  securityGroups?: ec2.ISecurityGroup[];
  /**
   * 初期状態で有効にするか
   * @default false
   */
  enabled?: boolean;
  /**
   * ルールの説明
   */
  description?: string;
}

/**
 * レイヤー1: Scheduled Task Construct（単一リソース）
 *
 * 責務: EventBridge Rule + ECS Scheduled Task を抽象化
 * - Cronまたはrateベースのスケジュール
 * - Fargate Taskの定期実行
 *
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class ScheduledTaskConstruct extends Construct {
  public readonly rule: events.Rule;

  constructor(
    scope: Construct,
    id: string,
    props: ScheduledTaskConstructProps
  ) {
    super(scope, id);

    // サブネット選択（デフォルト: PRIVATE_WITH_EGRESS）
    const subnetSelection = props.subnetSelection ?? {
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    };

    // EventBridge Rule
    this.rule = new events.Rule(this, 'Rule', {
      ruleName: props.ruleName,
      schedule: props.schedule,
      description: props.description,
      enabled: props.enabled ?? false, // デフォルトは無効
      targets: [
        new targets.EcsTask({
          cluster: props.cluster as ecs.Cluster,
          taskDefinition: props.taskDefinition,
          subnetSelection,
          securityGroups: props.securityGroups,
        }),
      ],
    });
  }

  /**
   * ルールを有効化
   */
  enable(): void {
    const cfnRule = this.rule.node.defaultChild as events.CfnRule;
    cfnRule.state = 'ENABLED';
  }

  /**
   * ルールを無効化
   */
  disable(): void {
    const cfnRule = this.rule.node.defaultChild as events.CfnRule;
    cfnRule.state = 'DISABLED';
  }
}

/**
 * よく使うスケジュールのヘルパー
 */
export const CommonSchedules = {
  /**
   * 毎日午前3時（JST）= UTC 18:00
   */
  dailyAt3amJst: () =>
    events.Schedule.cron({
      minute: '0',
      hour: '18',
    }),

  /**
   * 毎日午前0時（JST）= UTC 15:00
   */
  dailyAtMidnightJst: () =>
    events.Schedule.cron({
      minute: '0',
      hour: '15',
    }),

  /**
   * 毎時
   */
  hourly: () =>
    events.Schedule.cron({
      minute: '0',
    }),

  /**
   * 5分ごと
   */
  every5Minutes: () => events.Schedule.rate(Duration.minutes(5)),

  /**
   * 15分ごと
   */
  every15Minutes: () => events.Schedule.rate(Duration.minutes(15)),

  /**
   * 30分ごと
   */
  every30Minutes: () => events.Schedule.rate(Duration.minutes(30)),

  /**
   * 毎週月曜日の午前3時（JST）
   */
  weeklyMondayAt3amJst: () =>
    events.Schedule.cron({
      minute: '0',
      hour: '18',
      weekDay: 'MON',
    }),

  /**
   * 毎月1日の午前3時（JST）
   */
  monthlyFirstDayAt3amJst: () =>
    events.Schedule.cron({
      minute: '0',
      hour: '18',
      day: '1',
    }),
};

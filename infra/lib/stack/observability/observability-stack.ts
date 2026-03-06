import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../../config/environment';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export interface ObservabilityStackProps extends cdk.StackProps {
  /**
   * 監視対象のECSサービス
   */
  ecsService?: ecs.FargateService;
  /**
   * 監視対象のRDSクラスター（Aurora）
   */
  rdsCluster?: rds.DatabaseCluster;
  /**
   * 監視対象のRDSインスタンス
   */
  rdsInstance?: rds.DatabaseInstance;
  /**
   * 監視対象のLambda関数
   */
  lambdaFunction?: lambda.Function;
  /**
   * 監視対象のALB
   */
  alb?: elbv2.ApplicationLoadBalancer;
}

/**
 * レイヤー3: Observability Stack（可観測性スタック）
 * 
 * 責務: システム監視・運用の提供
 * - CloudWatch Alarms
 * - CloudWatch Dashboard
 * - メトリクス監視
 * 
 * 注: Resource層は使用せず、直接CloudWatch構築
 * （監視は他のスタックのリソースを参照するため）
 * 
 * 変更頻度: 月1回（監視設定追加）
 * デプロイ時間: 約2-3分
 */
export class ObservabilityStack extends cdk.Stack {
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(
    scope: Construct,
    id: string,
    config: EnvironmentConfig,
    props?: ObservabilityStackProps
  ) {
    super(scope, id, props);

    // CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${config.envName}-cdk-template-dashboard`,
    });

    // ECSサービスのメトリクス
    if (props?.ecsService) {
      const cpuAlarm = new cloudwatch.Alarm(this, 'EcsCpuAlarm', {
        alarmName: `${config.envName}-cdk-template-ecs-cpu`,
        metric: props.ecsService.metricCpuUtilization(),
        threshold: 80,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });

      this.dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'ECS CPU Utilization',
          left: [props.ecsService.metricCpuUtilization()],
        })
      );
    }

    // Aurora クラスターのメトリクス
    if (props?.rdsCluster) {
      const rdsAlarm = new cloudwatch.Alarm(this, 'AuroraCpuAlarm', {
        alarmName: `${config.envName}-cdk-template-aurora-cpu`,
        metric: props.rdsCluster.metricCPUUtilization(),
        threshold: 80,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });

      this.dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Aurora CPU Utilization',
          left: [props.rdsCluster.metricCPUUtilization()],
        })
      );
    }

    // RDS インスタンスのメトリクス
    if (props?.rdsInstance) {
      const rdsAlarm = new cloudwatch.Alarm(this, 'RdsCpuAlarm', {
        alarmName: `${config.envName}-cdk-template-rds-cpu`,
        metric: props.rdsInstance.metricCPUUtilization(),
        threshold: 80,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });

      this.dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'RDS CPU Utilization',
          left: [props.rdsInstance.metricCPUUtilization()],
        })
      );
    }

    // Lambda関数のメトリクス
    if (props?.lambdaFunction) {
      const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
        alarmName: `${config.envName}-cdk-template-lambda-errors`,
        metric: props.lambdaFunction.metricErrors(),
        threshold: 5,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });

      this.dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Lambda Invocations & Errors',
          left: [props.lambdaFunction.metricInvocations()],
          right: [props.lambdaFunction.metricErrors()],
        })
      );
    }

    // ALBのメトリクス
    if (props?.alb) {
      this.dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'ALB Request Count',
          left: [props.alb.metricRequestCount()],
        })
      );
    }

    // タグ付け
    cdk.Tags.of(this).add('Environment', config.envName);
    cdk.Tags.of(this).add('Project', config.tags.Project);
    cdk.Tags.of(this).add('ManagedBy', config.tags.ManagedBy);

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${
        cdk.Stack.of(this).region
      }#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });
  }
}

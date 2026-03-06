import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Template } from 'aws-cdk-lib/assertions';
import { ObservabilityStack } from '../../lib/stack/observability/observability-stack';
import { testConfig } from '../test-config';

describe('ObservabilityStack', () => {
  describe('With ECS Service', () => {
    let app: cdk.App;
    let vpc: ec2.IVpc;
    let ecsService: ecs.FargateService;
    let stack: ObservabilityStack;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();

      // Create mock resources
      const mockStack = new cdk.Stack(app, 'MockStack', {
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      vpc = new ec2.Vpc(mockStack, 'MockVpc', { maxAzs: 2 });

      const cluster = new ecs.Cluster(mockStack, 'MockCluster', { vpc });
      const taskDefinition = new ecs.FargateTaskDefinition(
        mockStack,
        'MockTaskDef',
        {
          cpu: 256,
          memoryLimitMiB: 512,
        }
      );
      taskDefinition.addContainer('app', {
        image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
      });
      ecsService = new ecs.FargateService(mockStack, 'MockEcsService', {
        cluster,
        taskDefinition,
      });

      stack = new ObservabilityStack(app, 'TestObservabilityStack', testConfig, {
        ecsService,
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      template = Template.fromStack(stack);
    });

    describe('CloudWatch Dashboard', () => {
      it('should create a CloudWatch dashboard', () => {
        template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
      });

      it('should have correct dashboard name', () => {
        template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
          DashboardName: `${testConfig.envName}-cdk-template-dashboard`,
        });
      });
    });

    describe('CloudWatch Alarms', () => {
      it('should create ECS CPU utilization alarm', () => {
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          MetricName: 'CPUUtilization',
          Namespace: 'AWS/ECS',
        });
      });
    });

    describe('Outputs', () => {
      it('should export dashboard URL', () => {
        const outputs = template.findOutputs('*');
        expect(Object.keys(outputs)).toContain('DashboardUrl');
      });
    });
  });

  describe('With Lambda Function', () => {
    let app: cdk.App;
    let lambdaFunction: lambda.Function;
    let stack: ObservabilityStack;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();

      const mockStack = new cdk.Stack(app, 'MockStack', {
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      lambdaFunction = new lambda.Function(mockStack, 'MockLambda', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {};'),
      });

      stack = new ObservabilityStack(app, 'TestObservabilityStack', testConfig, {
        lambdaFunction,
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      template = Template.fromStack(stack);
    });

    it('should create Lambda error alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'Errors',
        Namespace: 'AWS/Lambda',
      });
    });
  });

  describe('With Aurora Cluster', () => {
    let app: cdk.App;
    let rdsCluster: rds.DatabaseCluster;
    let stack: ObservabilityStack;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();

      const mockStack = new cdk.Stack(app, 'MockStack', {
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      const vpc = new ec2.Vpc(mockStack, 'MockVpc', { maxAzs: 2 });
      rdsCluster = new rds.DatabaseCluster(mockStack, 'MockRdsCluster', {
        engine: rds.DatabaseClusterEngine.auroraPostgres({
          version: rds.AuroraPostgresEngineVersion.VER_15_3,
        }),
        writer: rds.ClusterInstance.serverlessV2('writer'),
        vpc,
      });

      stack = new ObservabilityStack(app, 'TestObservabilityStack', testConfig, {
        rdsCluster,
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      template = Template.fromStack(stack);
    });

    it('should create Aurora CPU utilization alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'CPUUtilization',
        Namespace: 'AWS/RDS',
      });
    });
  });

  describe('Minimal Configuration', () => {
    let app: cdk.App;
    let stack: ObservabilityStack;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();

      stack = new ObservabilityStack(app, 'TestObservabilityStack', testConfig, {
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      template = Template.fromStack(stack);
    });

    it('should create a dashboard even without monitored resources', () => {
      template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
    });

    it('should synthesize successfully', () => {
      expect(() => app.synth()).not.toThrow();
    });
  });
});

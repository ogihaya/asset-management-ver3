import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as events from 'aws-cdk-lib/aws-events';
import {
  ScheduledTaskConstruct,
  CommonSchedules,
} from '../../../lib/construct/compute/scheduled-task-construct';

describe('ScheduledTaskConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let cluster: ecs.Cluster;
  let taskDefinition: ecs.FargateTaskDefinition;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'ap-northeast-1' },
    });
    vpc = new ec2.Vpc(stack, 'TestVpc');
    cluster = new ecs.Cluster(stack, 'TestCluster', { vpc });
    taskDefinition = new ecs.FargateTaskDefinition(stack, 'TestTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
    });
    taskDefinition.addContainer('test', {
      image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
    });
  });

  describe('Basic Configuration', () => {
    let template: Template;

    beforeEach(() => {
      new ScheduledTaskConstruct(stack, 'TestScheduledTask', {
        ruleName: 'test-rule',
        cluster,
        taskDefinition,
        schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      });
      template = Template.fromStack(stack);
    });

    it('should create an EventBridge Rule', () => {
      template.resourceCountIs('AWS::Events::Rule', 1);
    });

    it('should have correct rule name', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: 'test-rule',
      });
    });

    it('should be disabled by default', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        State: 'DISABLED',
      });
    });

    it('should have ECS target', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Targets: Match.arrayWith([
          Match.objectLike({
            Arn: Match.anyValue(),
            EcsParameters: Match.objectLike({
              TaskDefinitionArn: Match.anyValue(),
              LaunchType: 'FARGATE',
            }),
          }),
        ]),
      });
    });
  });

  describe('Enabled State', () => {
    it('should be enabled when specified', () => {
      new ScheduledTaskConstruct(stack, 'TestScheduledTask', {
        ruleName: 'test-rule',
        cluster,
        taskDefinition,
        schedule: events.Schedule.rate(cdk.Duration.hours(1)),
        enabled: true,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Events::Rule', {
        State: 'ENABLED',
      });
    });
  });

  describe('Description', () => {
    it('should have description when provided', () => {
      new ScheduledTaskConstruct(stack, 'TestScheduledTask', {
        ruleName: 'test-rule',
        cluster,
        taskDefinition,
        schedule: events.Schedule.rate(cdk.Duration.hours(1)),
        description: 'Test scheduled task description',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Events::Rule', {
        Description: 'Test scheduled task description',
      });
    });
  });

  describe('Security Groups', () => {
    it('should use provided security groups', () => {
      const sg = new ec2.SecurityGroup(stack, 'TestSg', { vpc });
      new ScheduledTaskConstruct(stack, 'TestScheduledTask', {
        ruleName: 'test-rule',
        cluster,
        taskDefinition,
        schedule: events.Schedule.rate(cdk.Duration.hours(1)),
        securityGroups: [sg],
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Events::Rule', {
        Targets: Match.arrayWith([
          Match.objectLike({
            EcsParameters: Match.objectLike({
              NetworkConfiguration: Match.objectLike({
                AwsVpcConfiguration: Match.objectLike({
                  SecurityGroups: Match.anyValue(),
                }),
              }),
            }),
          }),
        ]),
      });
    });
  });

  describe('Construct Properties', () => {
    it('should expose rule property', () => {
      const construct = new ScheduledTaskConstruct(stack, 'TestScheduledTask', {
        ruleName: 'test-rule',
        cluster,
        taskDefinition,
        schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      });

      expect(construct.rule).toBeDefined();
    });
  });
});

describe('CommonSchedules', () => {
  describe('dailyAt3amJst', () => {
    it('should return cron schedule for 18:00 UTC (03:00 JST)', () => {
      const schedule = CommonSchedules.dailyAt3amJst();
      expect(schedule).toBeDefined();
      expect(schedule.expressionString).toContain('cron');
    });
  });

  describe('dailyAtMidnightJst', () => {
    it('should return cron schedule for 15:00 UTC (00:00 JST)', () => {
      const schedule = CommonSchedules.dailyAtMidnightJst();
      expect(schedule).toBeDefined();
      expect(schedule.expressionString).toContain('cron');
    });
  });

  describe('hourly', () => {
    it('should return hourly cron schedule', () => {
      const schedule = CommonSchedules.hourly();
      expect(schedule).toBeDefined();
      expect(schedule.expressionString).toContain('cron');
    });
  });

  describe('every5Minutes', () => {
    it('should return 5 minute rate schedule', () => {
      const schedule = CommonSchedules.every5Minutes();
      expect(schedule).toBeDefined();
      expect(schedule.expressionString).toContain('rate');
      expect(schedule.expressionString).toContain('5');
    });
  });

  describe('every15Minutes', () => {
    it('should return 15 minute rate schedule', () => {
      const schedule = CommonSchedules.every15Minutes();
      expect(schedule).toBeDefined();
      expect(schedule.expressionString).toContain('rate');
      expect(schedule.expressionString).toContain('15');
    });
  });

  describe('every30Minutes', () => {
    it('should return 30 minute rate schedule', () => {
      const schedule = CommonSchedules.every30Minutes();
      expect(schedule).toBeDefined();
      expect(schedule.expressionString).toContain('rate');
      expect(schedule.expressionString).toContain('30');
    });
  });

  describe('weeklyMondayAt3amJst', () => {
    it('should return weekly Monday cron schedule', () => {
      const schedule = CommonSchedules.weeklyMondayAt3amJst();
      expect(schedule).toBeDefined();
      expect(schedule.expressionString).toContain('cron');
      expect(schedule.expressionString).toContain('MON');
    });
  });

  describe('monthlyFirstDayAt3amJst', () => {
    it('should return monthly first day cron schedule', () => {
      const schedule = CommonSchedules.monthlyFirstDayAt3amJst();
      expect(schedule).toBeDefined();
      expect(schedule.expressionString).toContain('cron');
    });
  });
});

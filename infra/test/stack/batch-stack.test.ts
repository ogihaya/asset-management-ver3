import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { FoundationStack } from '../../lib/stack/foundation/foundation-stack';
import { BackendStack } from '../../lib/stack/backend/backend-stack';
import { BatchStack } from '../../lib/stack/batch/batch-stack';
import { testConfig } from '../test-config';
import { EnvironmentConfig } from '../../config/environment';

describe('BatchStack', () => {
  let app: cdk.App;
  let foundationStack: FoundationStack;
  let backendStack: BackendStack;
  let batchStack: BatchStack;
  let template: Template;
  let batchEnabledConfig: EnvironmentConfig;

  beforeEach(() => {
    app = new cdk.App();

    // Batch有効な設定
    batchEnabledConfig = {
      ...testConfig,
      batch: {
        enabled: true,
        cpu: 512,
        memory: 1024,
        useExistingCluster: true,
      },
    };

    foundationStack = new FoundationStack(
      app,
      'TestFoundationStack',
      batchEnabledConfig,
      {
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      }
    );

    backendStack = new BackendStack(
      app,
      'TestBackendStack',
      batchEnabledConfig,
      {
        vpc: foundationStack.vpc,
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      }
    );

    batchStack = new BatchStack(
      app,
      'TestBatchStack',
      batchEnabledConfig,
      {
        vpc: foundationStack.vpc,
        ecsCluster: backendStack.ecsCluster,
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      }
    );

    template = Template.fromStack(batchStack);
  });

  describe('CloudWatch Logs', () => {
    it('should create a CloudWatch Log Group', () => {
      template.resourceCountIs('AWS::Logs::LogGroup', 1);
    });

    it('should have correct log group name', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/ecs/test/batch',
      });
    });

    it('should have retention period set', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: Match.anyValue(),
      });
    });
  });

  describe('Security Group', () => {
    it('should create a security group', () => {
      // BatchStack creates its own security group
      expect(batchStack.securityGroup).toBeDefined();
    });

    it('should allow all outbound traffic', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupEgress: Match.arrayWith([
          Match.objectLike({
            IpProtocol: '-1',
            CidrIp: '0.0.0.0/0',
          }),
        ]),
      });
    });
  });

  describe('ECS Task Definition', () => {
    it('should create a task definition', () => {
      template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
    });

    it('should use Fargate compatibility', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        RequiresCompatibilities: ['FARGATE'],
        NetworkMode: 'awsvpc',
      });
    });

    it('should have correct CPU from config', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Cpu: '512',
      });
    });

    it('should have correct memory from config', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Memory: '1024',
      });
    });

    it('should have container definition with logging', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Name: 'batch',
            LogConfiguration: Match.objectLike({
              LogDriver: 'awslogs',
            }),
          }),
        ]),
      });
    });

    it('should have environment variable set', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Environment: Match.arrayWith([
              Match.objectLike({
                Name: 'ENV',
                Value: 'test',
              }),
            ]),
          }),
        ]),
      });
    });
  });

  describe('EventBridge Rule (Scheduled Task)', () => {
    it('should create an EventBridge Rule', () => {
      template.resourceCountIs('AWS::Events::Rule', 1);
    });

    it('should have correct rule name', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: 'test-daily-batch',
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
            EcsParameters: Match.objectLike({
              TaskDefinitionArn: Match.anyValue(),
              LaunchType: 'FARGATE',
            }),
          }),
        ]),
      });
    });

    it('should have schedule expression', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        ScheduleExpression: Match.anyValue(),
      });
    });
  });

  describe('Outputs', () => {
    it('should export Batch Cluster Name', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('BatchClusterName');
    });

    it('should export Batch Task Definition ARN', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('BatchTaskDefinitionArn');
    });

    it('should export Batch Log Group Name', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('BatchLogGroupName');
    });

    it('should export Batch Security Group ID', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('BatchSecurityGroupId');
    });
  });

  describe('Stack Properties', () => {
    it('should synthesize successfully', () => {
      expect(() => app.synth()).not.toThrow();
    });

    it('should expose cluster property', () => {
      expect(batchStack.cluster).toBeDefined();
    });

    it('should expose taskDefinition property', () => {
      expect(batchStack.taskDefinition).toBeDefined();
    });

    it('should expose logGroup property', () => {
      expect(batchStack.logGroup).toBeDefined();
    });

    it('should expose securityGroup property', () => {
      expect(batchStack.securityGroup).toBeDefined();
    });
  });

  describe('Tags', () => {
    it('should have Environment tag', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Environment',
            Value: 'test',
          }),
        ]),
      });
    });

    it('should have Layer tag', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Layer',
            Value: 'Batch',
          }),
        ]),
      });
    });
  });
});

describe('BatchStack with new cluster', () => {
  let app: cdk.App;
  let foundationStack: FoundationStack;
  let batchStack: BatchStack;
  let template: Template;
  let batchNewClusterConfig: EnvironmentConfig;

  beforeEach(() => {
    app = new cdk.App();

    // 新規クラスター作成設定
    batchNewClusterConfig = {
      ...testConfig,
      batch: {
        enabled: true,
        cpu: 256,
        memory: 512,
        useExistingCluster: false,
      },
    };

    foundationStack = new FoundationStack(
      app,
      'TestFoundationStack',
      batchNewClusterConfig,
      {
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      }
    );

    batchStack = new BatchStack(
      app,
      'TestBatchStack',
      batchNewClusterConfig,
      {
        vpc: foundationStack.vpc,
        // ecsCluster is not provided, so a new one will be created
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      }
    );

    template = Template.fromStack(batchStack);
  });

  it('should create a new ECS cluster when not using existing', () => {
    template.resourceCountIs('AWS::ECS::Cluster', 1);
  });

  it('should have correct cluster name', () => {
    template.hasResourceProperties('AWS::ECS::Cluster', {
      ClusterName: 'test-batch-cluster',
    });
  });

  it('should use default CPU when not specified', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Cpu: '256',
    });
  });

  it('should use default memory when not specified', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Memory: '512',
    });
  });
});

describe('BatchStack with database access', () => {
  let app: cdk.App;
  let foundationStack: FoundationStack;
  let databaseSecurityGroup: ec2.SecurityGroup;
  let batchEnabledConfig: EnvironmentConfig;

  beforeEach(() => {
    app = new cdk.App();

    batchEnabledConfig = {
      ...testConfig,
      batch: {
        enabled: true,
        cpu: 256,
        memory: 512,
      },
    };

    foundationStack = new FoundationStack(
      app,
      'TestFoundationStack',
      batchEnabledConfig,
      {
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      }
    );

    // Create a mock database security group
    const mockStack = new cdk.Stack(app, 'MockStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
    databaseSecurityGroup = new ec2.SecurityGroup(mockStack, 'DbSg', {
      vpc: foundationStack.vpc,
      description: 'Mock database security group',
    });

    // BatchStack creation triggers the security group ingress rule addition
    new BatchStack(
      app,
      'TestBatchStack',
      batchEnabledConfig,
      {
        vpc: foundationStack.vpc,
        databaseSecurityGroup,
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      }
    );
  });

  it('should add ingress rule for PostgreSQL access', () => {
    // The database security group should have an ingress rule added
    const mockTemplate = Template.fromStack(
      cdk.Stack.of(databaseSecurityGroup)
    );
    mockTemplate.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      FromPort: 5432,
      ToPort: 5432,
    });
  });
});

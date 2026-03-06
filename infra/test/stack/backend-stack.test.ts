import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FoundationStack } from '../../lib/stack/foundation/foundation-stack';
import { BackendStack } from '../../lib/stack/backend/backend-stack';
import { testConfig } from '../test-config';

describe('BackendStack', () => {
  let app: cdk.App;
  let foundationStack: FoundationStack;
  let backendStack: BackendStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();

    foundationStack = new FoundationStack(
      app,
      'TestFoundationStack',
      testConfig,
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
      testConfig,
      {
        vpc: foundationStack.vpc,
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      }
    );

    template = Template.fromStack(backendStack);
  });

  describe('Lambda Function', () => {
    it('should create a Lambda function when lambdaConfig is provided', () => {
      template.resourceCountIs('AWS::Lambda::Function', 1);
    });

    it('should use correct runtime', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
      });
    });

    it('should have correct memory size from config', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: testConfig.lambda?.memorySize,
      });
    });

    it('should have correct timeout from config', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: testConfig.lambda?.timeout,
      });
    });
  });

  describe('ECS Cluster', () => {
    it('should create an ECS cluster', () => {
      template.resourceCountIs('AWS::ECS::Cluster', 1);
    });

    it('should enable Container Insights', () => {
      template.hasResourceProperties('AWS::ECS::Cluster', {
        ClusterSettings: [
          {
            Name: 'containerInsights',
            Value: 'enabled',
          },
        ],
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

    it('should have container definition', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Name: 'app',
            Essential: true,
          }),
        ]),
      });
    });
  });

  describe('ECS Service', () => {
    it('should create an ECS service', () => {
      template.resourceCountIs('AWS::ECS::Service', 1);
    });

    it('should use Fargate launch type', () => {
      template.hasResourceProperties('AWS::ECS::Service', {
        LaunchType: 'FARGATE',
      });
    });
  });

  describe('Application Load Balancer', () => {
    it('should create an ALB', () => {
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    });

    it('should be internet-facing', () => {
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        Scheme: 'internet-facing',
        Type: 'application',
      });
    });

    it('should create a listener', () => {
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 1);
    });

    it('should create a target group', () => {
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 1);
    });
  });

  describe('API Gateway', () => {
    it('should create a REST API when lambda is enabled', () => {
      template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    });

    it('should have a deployment', () => {
      template.resourceCountIs('AWS::ApiGateway::Deployment', 1);
    });

    it('should have a stage', () => {
      template.resourceCountIs('AWS::ApiGateway::Stage', 1);
    });
  });

  describe('Security Groups', () => {
    it('should create security groups', () => {
      // At minimum: ALB SG, ECS SG
      const resources = template.findResources('AWS::EC2::SecurityGroup');
      expect(Object.keys(resources).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Outputs', () => {
    it('should export ALB DNS name', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('AlbDnsName');
    });

    it('should export API Gateway URL when lambda is enabled', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('ApiGatewayUrl');
    });

    it('should export Lambda Function Name when lambda is enabled', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('LambdaFunctionName');
    });

    it('should export ECS Cluster Name', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('EcsClusterName');
    });
  });

  describe('Stack Properties', () => {
    it('should synthesize successfully', () => {
      expect(() => app.synth()).not.toThrow();
    });
  });
});

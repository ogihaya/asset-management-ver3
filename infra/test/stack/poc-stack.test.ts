import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { PocStack } from '../../lib/stack/poc/poc-stack';
import { testConfig } from '../test-config';

describe('PocStack', () => {
  let app: cdk.App;
  let stack: PocStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new PocStack(
      app,
      'TestPocStack',
      testConfig,
      {
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      }
    );
    template = Template.fromStack(stack);
  });

  describe('Core Resources', () => {
    it('should create a VPC', () => {
      template.resourceCountIs('AWS::EC2::VPC', 1);
    });

    it('should create a Lambda function when lambdaConfig is provided', () => {
      // testConfig has lambda config, so Lambda should be created
      // Note: There might be additional Lambda functions for S3 auto-delete custom resource
      const resources = template.findResources('AWS::Lambda::Function');
      expect(Object.keys(resources).length).toBeGreaterThanOrEqual(1);
    });

    it('should create an API Gateway when Lambda is enabled', () => {
      template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    });

    it('should create an ALB', () => {
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    });

    it('should create an ECS cluster', () => {
      template.resourceCountIs('AWS::ECS::Cluster', 1);
    });
  });

  describe('Database Configuration', () => {
    it('should create RDS when enableRds is true', () => {
      // testConfig has enableRds: true
      template.resourceCountIs('AWS::RDS::DBInstance', 1);
    });

    it('should not create DynamoDB when enableDynamo is false', () => {
      // testConfig has enableDynamo: false
      template.resourceCountIs('AWS::DynamoDB::Table', 0);
    });

    it('should not create Aurora when enableAurora is false', () => {
      // testConfig has enableAurora: false
      template.resourceCountIs('AWS::RDS::DBCluster', 0);
    });
  });

  describe('Frontend Configuration', () => {
    it('should create Amplify App when frontend type is amplify', () => {
      // testConfig has frontend.type: 'amplify'
      template.resourceCountIs('AWS::Amplify::App', 1);
    });

    it('should not create CloudFront distribution when using Amplify', () => {
      template.resourceCountIs('AWS::CloudFront::Distribution', 0);
    });
  });

  describe('Optional Resources (Commented by Default)', () => {
    it('should NOT create Cognito resources in minimal PoC', () => {
      const resources = template.toJSON().Resources;
      const userPools = Object.values(resources).filter(
        (r: any) => r.Type === 'AWS::Cognito::UserPool'
      );
      expect(userPools.length).toBe(0);
    });

    it('should NOT create SNS/SQS resources in minimal PoC', () => {
      const resources = template.toJSON().Resources;
      const snsTopics = Object.values(resources).filter(
        (r: any) => r.Type === 'AWS::SNS::Topic'
      );
      const sqsQueues = Object.values(resources).filter(
        (r: any) => r.Type === 'AWS::SQS::Queue'
      );
      expect(snsTopics.length).toBe(0);
      expect(sqsQueues.length).toBe(0);
    });
  });

  describe('ECS Configuration', () => {
    it('should enable Container Insights for ECS', () => {
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

  describe('Outputs', () => {
    it('should export essential outputs', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs).length).toBeGreaterThan(0);
    });

    it('should export API Gateway URL', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('ApiGatewayUrl');
    });

    it('should export Frontend URL', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('FrontendUrl');
    });

    it('should export ALB DNS name', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('AlbDnsName');
    });

    it('should export Amplify App ID when using Amplify', () => {
      const outputs = template.findOutputs('*');
      const outputKeys = Object.keys(outputs);
      // AmplifyConstruct outputs the App ID with construct path prefix
      const hasAmplifyAppId = outputKeys.some(key => key.includes('AmplifyAppId'));
      expect(hasAmplifyAppId).toBe(true);
    });
  });

  describe('Cost Optimization', () => {
    it('should use minimal ECS task resources', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Cpu: '256',
        Memory: '512',
      });
    });

    it('should use single NAT Gateway', () => {
      template.resourceCountIs('AWS::EC2::NatGateway', testConfig.network.natGateways);
    });
  });

  describe('Stack Properties', () => {
    it('should have correct stack name pattern', () => {
      expect(stack.stackName).toMatch(/TestPocStack/);
    });

    it('should synthesize successfully', () => {
      expect(() => app.synth()).not.toThrow();
    });

    it('should have environment-specific configuration', () => {
      expect(stack).toBeDefined();
    });
  });
});

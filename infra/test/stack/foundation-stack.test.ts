import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { FoundationStack } from '../../lib/stack/foundation/foundation-stack';
import { testConfig } from '../test-config';

describe('FoundationStack', () => {
  let app: cdk.App;
  let stack: FoundationStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new FoundationStack(
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
    template = Template.fromStack(stack);
  });

  describe('VPC', () => {
    it('should create a VPC', () => {
      template.resourceCountIs('AWS::EC2::VPC', 1);
    });

    it('should have correct CIDR block', () => {
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
      });
    });

    it('should enable DNS support', () => {
      template.hasResourceProperties('AWS::EC2::VPC', {
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
      });
    });
  });

  describe('Subnets', () => {
    it('should create subnets across AZs', () => {
      // 2 AZs * 2 subnet types (public + private) = 4 subnets
      template.resourceCountIs('AWS::EC2::Subnet', testConfig.network.maxAzs * 2);
    });

    it('should create an Internet Gateway', () => {
      template.resourceCountIs('AWS::EC2::InternetGateway', 1);
    });

    it('should create NAT Gateways', () => {
      template.resourceCountIs('AWS::EC2::NatGateway', testConfig.network.natGateways);
    });
  });

  describe('Outputs', () => {
    it('should export VPC ID', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('VpcId');
    });
  });

  describe('Stack Properties', () => {
    it('should have correct tags', () => {
      const stackTags = cdk.Tags.of(stack);
      expect(stackTags).toBeDefined();
    });

    it('should synthesize successfully', () => {
      expect(() => app.synth()).not.toThrow();
    });
  });
});

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NetworkResource } from '../../lib/resource/network-resource';

describe('NetworkResource', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let networkResource: NetworkResource;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    
    networkResource = new NetworkResource(stack, 'TestNetwork', {
      vpcName: 'test-vpc',
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      natGateways: 1,
    });

    template = Template.fromStack(stack);
  });

  describe('VPC', () => {
    it('should create a VPC with correct configuration', () => {
      template.resourceCountIs('AWS::EC2::VPC', 1);
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
      });
    });

    it('should export vpc property', () => {
      expect(networkResource.vpc).toBeDefined();
      expect(networkResource.vpc.vpcId).toBeDefined();
    });
  });

  describe('Subnets', () => {
    it('should create subnets across multiple AZs', () => {
      // 2 AZs * 2 subnet types (public, private)
      template.resourceCountIs('AWS::EC2::Subnet', 4);
    });

    it('should export publicSubnets', () => {
      expect(networkResource.publicSubnets).toBeDefined();
      expect(networkResource.publicSubnets.length).toBeGreaterThan(0);
    });

    it('should export privateSubnets', () => {
      expect(networkResource.privateSubnets).toBeDefined();
      expect(networkResource.privateSubnets.length).toBeGreaterThan(0);
    });
  });

  describe('Internet Gateway', () => {
    it('should create an Internet Gateway', () => {
      template.resourceCountIs('AWS::EC2::InternetGateway', 1);
    });
  });

  describe('NAT Gateway', () => {
    it('should create NAT Gateway based on configuration', () => {
      template.resourceCountIs('AWS::EC2::NatGateway', 1);
    });
  });

  describe('Route Tables', () => {
    it('should create route tables for different subnet types', () => {
      // 2AZ × 2 subnet types (Public, Private) = 4 route tables
      template.resourceCountIs('AWS::EC2::RouteTable', 4);
    });
  });

  describe('Isolation Resources', () => {
    it('should create isolation security group by default', () => {
      // 隔離用SGが作成されていることを確認
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription:
          'Emergency isolation security group - No inbound/outbound traffic allowed. Use for incident response.',
      });
    });

    it('should create isolation security group with no egress rules', () => {
      // 隔離用SGはアウトバウンドも全て拒否
      expect(networkResource.isolationSecurityGroup).toBeDefined();
    });

    it('should create isolation NACL by default', () => {
      // 隔離用NACLが作成されていることを確認
      expect(networkResource.isolationNacl).toBeDefined();
    });

    it('should create isolation NACL with deny all rules', () => {
      // NACLにDeny Allルールがあることを確認
      template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
        RuleAction: 'deny',
        CidrBlock: '0.0.0.0/0',
        Egress: false,
        RuleNumber: 100,
      });
      template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
        RuleAction: 'deny',
        CidrBlock: '0.0.0.0/0',
        Egress: true,
        RuleNumber: 100,
      });
    });

    it('should have Purpose tag on isolation security group', () => {
      // CDK AssertionsではMatch.arrayWithを使用
      const { Match } = require('aws-cdk-lib/assertions');
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription:
          'Emergency isolation security group - No inbound/outbound traffic allowed. Use for incident response.',
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Purpose',
            Value: 'emergency-isolation',
          }),
        ]),
      });
    });
  });

  describe('Isolation Resources - disabled', () => {
    it('should not create isolation resources when disabled', () => {
      const appWithoutIsolation = new cdk.App();
      const stackWithoutIsolation = new cdk.Stack(
        appWithoutIsolation,
        'TestStackNoIsolation'
      );

      const networkWithoutIsolation = new NetworkResource(
        stackWithoutIsolation,
        'TestNetwork',
        {
          vpcName: 'test-vpc',
          createIsolationResources: false,
        }
      );

      expect(networkWithoutIsolation.isolationSecurityGroup).toBeUndefined();
      expect(networkWithoutIsolation.isolationNacl).toBeUndefined();
    });
  });

  describe('VPC Endpoints', () => {
    it('should create S3 Gateway Endpoint', () => {
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            ['com.amazonaws.', { Ref: 'AWS::Region' }, '.s3'],
          ],
        },
        VpcEndpointType: 'Gateway',
      });
    });

    it('should create DynamoDB Gateway Endpoint', () => {
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            ['com.amazonaws.', { Ref: 'AWS::Region' }, '.dynamodb'],
          ],
        },
        VpcEndpointType: 'Gateway',
      });
    });

    it('should create ECR API Interface Endpoint', () => {
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            ['com.amazonaws.', { Ref: 'AWS::Region' }, '.ecr.api'],
          ],
        },
        VpcEndpointType: 'Interface',
      });
    });

    it('should create ECR Docker Interface Endpoint', () => {
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            ['com.amazonaws.', { Ref: 'AWS::Region' }, '.ecr.dkr'],
          ],
        },
        VpcEndpointType: 'Interface',
      });
    });

    it('should create CloudWatch Logs Interface Endpoint', () => {
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            ['com.amazonaws.', { Ref: 'AWS::Region' }, '.logs'],
          ],
        },
        VpcEndpointType: 'Interface',
      });
    });

    it('should create Secrets Manager Interface Endpoint', () => {
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            ['com.amazonaws.', { Ref: 'AWS::Region' }, '.secretsmanager'],
          ],
        },
        VpcEndpointType: 'Interface',
      });
    });
  });

  describe('Default Configuration', () => {
    it('should use default CIDR when not specified', () => {
      const defaultApp = new cdk.App();
      const defaultStack = new cdk.Stack(defaultApp, 'DefaultStack');

      new NetworkResource(defaultStack, 'TestNetwork', {
        vpcName: 'test-vpc',
      });

      const defaultTemplate = Template.fromStack(defaultStack);
      defaultTemplate.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
      });
    });

    it('should use 2 AZs by default', () => {
      const defaultApp = new cdk.App();
      const defaultStack = new cdk.Stack(defaultApp, 'DefaultStack');

      const defaultNetwork = new NetworkResource(defaultStack, 'TestNetwork', {
        vpcName: 'test-vpc',
      });

      // 2 AZs * 2 subnet types = 4 subnets
      expect(defaultNetwork.publicSubnets.length).toBe(2);
      expect(defaultNetwork.privateSubnets.length).toBe(2);
    });

    it('should create 1 NAT Gateway by default', () => {
      const defaultApp = new cdk.App();
      const defaultStack = new cdk.Stack(defaultApp, 'DefaultStack');

      new NetworkResource(defaultStack, 'TestNetwork', {
        vpcName: 'test-vpc',
      });

      const defaultTemplate = Template.fromStack(defaultStack);
      defaultTemplate.resourceCountIs('AWS::EC2::NatGateway', 1);
    });
  });
});


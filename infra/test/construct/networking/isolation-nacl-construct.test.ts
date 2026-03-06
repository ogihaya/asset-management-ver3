import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { IsolationNaclConstruct } from '../../../lib/construct/networking/isolation-nacl-construct';

describe('IsolationNaclConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let construct: IsolationNaclConstruct;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

    construct = new IsolationNaclConstruct(stack, 'IsolationNACL', {
      vpc,
      namePrefix: 'test',
    });

    template = Template.fromStack(stack);
  });

  describe('NACL Creation', () => {
    it('should create a network ACL', () => {
      template.resourceCountIs('AWS::EC2::NetworkAcl', 1);
    });

    it('should export nacl property', () => {
      expect(construct.nacl).toBeDefined();
    });

    it('should have correct naming', () => {
      template.hasResourceProperties('AWS::EC2::NetworkAcl', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Name',
            Value: 'test-emergency-isolation-nacl',
          }),
        ]),
      });
    });
  });

  describe('Deny All Rules - IPv4', () => {
    it('should deny all inbound IPv4 traffic', () => {
      template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
        CidrBlock: '0.0.0.0/0',
        Egress: false,
        Protocol: -1,
        RuleAction: 'deny',
        RuleNumber: 100,
      });
    });

    it('should deny all outbound IPv4 traffic', () => {
      template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
        CidrBlock: '0.0.0.0/0',
        Egress: true,
        Protocol: -1,
        RuleAction: 'deny',
        RuleNumber: 100,
      });
    });
  });

  describe('Deny All Rules - IPv6', () => {
    it('should deny all inbound IPv6 traffic', () => {
      template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
        Ipv6CidrBlock: '::/0',
        Egress: false,
        Protocol: -1,
        RuleAction: 'deny',
        RuleNumber: 101,
      });
    });

    it('should deny all outbound IPv6 traffic', () => {
      template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
        Ipv6CidrBlock: '::/0',
        Egress: true,
        Protocol: -1,
        RuleAction: 'deny',
        RuleNumber: 101,
      });
    });
  });

  describe('NACL Entry Count', () => {
    it('should create exactly 4 NACL entries', () => {
      // 2 IPv4 (in/out) + 2 IPv6 (in/out) = 4 entries
      template.resourceCountIs('AWS::EC2::NetworkAclEntry', 4);
    });
  });

  describe('Tags', () => {
    it('should have Purpose tag', () => {
      template.hasResourceProperties('AWS::EC2::NetworkAcl', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Purpose',
            Value: 'emergency-isolation',
          }),
        ]),
      });
    });

    it('should have DoNotDelete tag', () => {
      template.hasResourceProperties('AWS::EC2::NetworkAcl', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'DoNotDelete',
            Value: 'true',
          }),
        ]),
      });
    });

    it('should have Usage tag', () => {
      template.hasResourceProperties('AWS::EC2::NetworkAcl', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Usage',
            Value: 'Associate with compromised subnets to isolate from network',
          }),
        ]),
      });
    });
  });

  describe('Default Name Prefix', () => {
    it('should use default prefix when not specified', () => {
      const appDefault = new cdk.App();
      const stackDefault = new cdk.Stack(appDefault, 'DefaultStack');
      const vpcDefault = new ec2.Vpc(stackDefault, 'Vpc', { maxAzs: 2 });

      new IsolationNaclConstruct(stackDefault, 'IsolationNACL', {
        vpc: vpcDefault,
        // namePrefix not specified
      });

      const templateDefault = Template.fromStack(stackDefault);
      templateDefault.hasResourceProperties('AWS::EC2::NetworkAcl', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Name',
            Value: 'isolation-emergency-isolation-nacl',
          }),
        ]),
      });
    });
  });

  describe('Subnet Association', () => {
    it('should be able to associate with a subnet', () => {
      // Create a new stack to test association
      const appAssoc = new cdk.App();
      const stackAssoc = new cdk.Stack(appAssoc, 'AssocStack');
      const vpcAssoc = new ec2.Vpc(stackAssoc, 'Vpc', { maxAzs: 1 });

      const naclConstruct = new IsolationNaclConstruct(
        stackAssoc,
        'IsolationNACL',
        {
          vpc: vpcAssoc,
        }
      );

      // Associate with the first public subnet
      naclConstruct.associateWithSubnet(vpcAssoc.publicSubnets[0]);

      const templateAssoc = Template.fromStack(stackAssoc);
      templateAssoc.resourceCountIs('AWS::EC2::SubnetNetworkAclAssociation', 1);
    });
  });
});

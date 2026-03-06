import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { IsolationSecurityGroupConstruct } from '../../../lib/construct/networking/isolation-security-group-construct';

describe('IsolationSecurityGroupConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let construct: IsolationSecurityGroupConstruct;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

    construct = new IsolationSecurityGroupConstruct(stack, 'IsolationSG', {
      vpc,
      namePrefix: 'test',
    });

    template = Template.fromStack(stack);
  });

  describe('Security Group Creation', () => {
    it('should create a security group', () => {
      // VPC default SG is not a CloudFormation resource, only isolation SG is created
      template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
    });

    it('should export securityGroup property', () => {
      expect(construct.securityGroup).toBeDefined();
      expect(construct.securityGroup.securityGroupId).toBeDefined();
    });

    it('should have correct naming', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupName: 'test-emergency-isolation-sg',
      });
    });

    it('should have correct description', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription:
          'Emergency isolation security group - No inbound/outbound traffic allowed. Use for incident response.',
      });
    });
  });

  describe('Traffic Rules', () => {
    it('should block all egress traffic', () => {
      // allowAllOutbound: false results in a deny-all egress rule
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupEgress: Match.arrayWith([
          Match.objectLike({
            CidrIp: '255.255.255.255/32',
            Description: 'Disallow all traffic',
          }),
        ]),
      });
    });

    it('should have no ingress rules', () => {
      // SecurityGroup should not have SecurityGroupIngress property
      const resources = template.findResources('AWS::EC2::SecurityGroup', {
        Properties: {
          GroupDescription: Match.stringLikeRegexp('Emergency isolation'),
        },
      });

      const sgKey = Object.keys(resources).find((key) =>
        resources[key].Properties.GroupDescription.includes('Emergency')
      );

      if (sgKey) {
        expect(resources[sgKey].Properties.SecurityGroupIngress).toBeUndefined();
      }
    });
  });

  describe('Tags', () => {
    it('should have Purpose tag', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Purpose',
            Value: 'emergency-isolation',
          }),
        ]),
      });
    });

    it('should have DoNotDelete tag', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'DoNotDelete',
            Value: 'true',
          }),
        ]),
      });
    });

    it('should have Usage tag', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Usage',
            Value: 'Attach to compromised resources to isolate from network',
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

      new IsolationSecurityGroupConstruct(stackDefault, 'IsolationSG', {
        vpc: vpcDefault,
        // namePrefix not specified
      });

      const templateDefault = Template.fromStack(stackDefault);
      templateDefault.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupName: 'isolation-emergency-isolation-sg',
      });
    });
  });
});

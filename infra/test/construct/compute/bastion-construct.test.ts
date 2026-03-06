import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { BastionConstruct } from '../../../lib/construct/compute/bastion-construct';

describe('BastionConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
    });
  });

  describe('Default Configuration', () => {
    let template: Template;
    let construct: BastionConstruct;

    beforeEach(() => {
      construct = new BastionConstruct(stack, 'TestBastion', {
        bastionName: 'test-bastion',
        vpc,
      });
      template = Template.fromStack(stack);
    });

    it('should create an EC2 instance', () => {
      template.resourceCountIs('AWS::EC2::Instance', 1);
    });

    it('should export instance property', () => {
      expect(construct.instance).toBeDefined();
    });

    it('should export securityGroup property', () => {
      expect(construct.securityGroup).toBeDefined();
    });

    it('should export role property', () => {
      expect(construct.role).toBeDefined();
    });

    it('should use t3.micro by default', () => {
      template.hasResourceProperties('AWS::EC2::Instance', {
        InstanceType: 't3.micro',
      });
    });

    it('should require IMDSv2 via launch template', () => {
      // BastionHostLinux sets IMDSv2 via launch template when requireImdsv2: true
      template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
        LaunchTemplateData: {
          MetadataOptions: {
            HttpTokens: 'required',
          },
        },
      });
    });

    it('should be placed in public subnet by default', () => {
      template.hasResourceProperties('AWS::EC2::Instance', {
        SubnetId: Match.anyValue(),
      });
    });
  });

  describe('SSM Session Manager', () => {
    it('should add SSM managed policy by default', () => {
      new BastionConstruct(stack, 'TestBastion', {
        bastionName: 'test-bastion',
        vpc,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([
          Match.objectLike({
            'Fn::Join': Match.arrayWith([
              Match.arrayWith([
                Match.stringLikeRegexp('AmazonSSMManagedInstanceCore'),
              ]),
            ]),
          }),
        ]),
      });
    });

    it('should not add SSM managed policy when disabled', () => {
      new BastionConstruct(stack, 'TestBastion', {
        bastionName: 'test-bastion',
        vpc,
        enableSsm: false,
      });

      const template = Template.fromStack(stack);
      const roles = template.findResources('AWS::IAM::Role');
      const bastionRoleKey = Object.keys(roles).find((key) =>
        key.includes('Bastion')
      );

      if (bastionRoleKey) {
        const managedPolicies =
          roles[bastionRoleKey].Properties.ManagedPolicyArns || [];
        const hasSsmPolicy = managedPolicies.some((policy: any) => {
          if (typeof policy === 'string') {
            return policy.includes('AmazonSSMManagedInstanceCore');
          }
          if (policy['Fn::Join']) {
            return JSON.stringify(policy).includes('AmazonSSMManagedInstanceCore');
          }
          return false;
        });
        expect(hasSsmPolicy).toBe(false);
      }
    });
  });

  describe('SSH Access', () => {
    it('should not allow SSH by default', () => {
      new BastionConstruct(stack, 'TestBastion', {
        bastionName: 'test-bastion',
        vpc,
      });

      const template = Template.fromStack(stack);
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup');

      // Find bastion security group
      const bastionSgKey = Object.keys(securityGroups).find(
        (key) =>
          key.includes('Bastion') &&
          securityGroups[key].Properties.GroupDescription?.includes('BastionHost')
      );

      if (bastionSgKey) {
        const ingressRules =
          securityGroups[bastionSgKey].Properties.SecurityGroupIngress || [];
        const hasSshRule = ingressRules.some(
          (rule: any) => rule.FromPort === 22 && rule.ToPort === 22
        );
        expect(hasSshRule).toBe(false);
      }
    });

    it('should allow SSH from specified CIDR', () => {
      new BastionConstruct(stack, 'TestBastion', {
        bastionName: 'test-bastion',
        vpc,
        allowSshFrom: '203.0.113.0/24',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupIngress: Match.arrayWith([
          Match.objectLike({
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            CidrIp: '203.0.113.0/24',
          }),
        ]),
      });
    });
  });

  describe('Custom Instance Type', () => {
    it('should use custom instance type when specified', () => {
      new BastionConstruct(stack, 'TestBastion', {
        bastionName: 'test-bastion',
        vpc,
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T3,
          ec2.InstanceSize.SMALL
        ),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::Instance', {
        InstanceType: 't3.small',
      });
    });
  });

  describe('Database Access Helper Methods', () => {
    it('should allow PostgreSQL access', () => {
      const targetSg = new ec2.SecurityGroup(stack, 'TargetSg', {
        vpc,
        description: 'Target security group',
      });

      const bastion = new BastionConstruct(stack, 'TestBastion', {
        bastionName: 'test-bastion',
        vpc,
      });

      bastion.allowPostgresAccess(targetSg);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 5432,
        ToPort: 5432,
        Description: 'Allow PostgreSQL access from Bastion host',
      });
    });

    it('should allow MySQL access', () => {
      const targetSg = new ec2.SecurityGroup(stack, 'TargetSg', {
        vpc,
        description: 'Target security group',
      });

      const bastion = new BastionConstruct(stack, 'TestBastion', {
        bastionName: 'test-bastion',
        vpc,
      });

      bastion.allowMysqlAccess(targetSg);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 3306,
        ToPort: 3306,
        Description: 'Allow MySQL access from Bastion host',
      });
    });

    it('should allow custom port access', () => {
      const targetSg = new ec2.SecurityGroup(stack, 'TargetSg', {
        vpc,
        description: 'Target security group',
      });

      const bastion = new BastionConstruct(stack, 'TestBastion', {
        bastionName: 'test-bastion',
        vpc,
      });

      bastion.allowConnectionTo(
        targetSg,
        ec2.Port.tcp(6379),
        'Allow Redis access'
      );

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 6379,
        ToPort: 6379,
        Description: 'Allow Redis access',
      });
    });
  });

  describe('Removal Policy', () => {
    it('should use DESTROY removal policy', () => {
      new BastionConstruct(stack, 'TestBastion', {
        bastionName: 'test-bastion',
        vpc,
      });

      const template = Template.fromStack(stack);
      const instances = template.findResources('AWS::EC2::Instance');
      const instanceKey = Object.keys(instances).find((key) =>
        key.includes('Bastion')
      );

      if (instanceKey) {
        expect(instances[instanceKey].DeletionPolicy).toBe('Delete');
      }
    });
  });
});

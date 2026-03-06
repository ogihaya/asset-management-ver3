import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';
import { RdsConstruct, RdsEngineType } from '../../lib/construct/datastore/rds-construct';

describe('RdsConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.IVpc;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });

    vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
    });
  });

  describe('PostgreSQL RDS Instance', () => {
    let rdsConstruct: RdsConstruct;
    let template: Template;

    beforeEach(() => {
      rdsConstruct = new RdsConstruct(stack, 'TestRds', {
        instanceName: 'test-postgres',
        vpc,
        engineType: RdsEngineType.POSTGRES,
      });

      template = Template.fromStack(stack);
    });

    it('should create an RDS instance', () => {
      template.resourceCountIs('AWS::RDS::DBInstance', 1);
    });

    it('should export instance property', () => {
      expect(rdsConstruct.instance).toBeDefined();
      expect(rdsConstruct.instance.instanceIdentifier).toBeDefined();
    });

    it('should export security group', () => {
      expect(rdsConstruct.securityGroup).toBeDefined();
    });

    it('should enable storage encryption', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        StorageEncrypted: true,
      });
    });

    it('should enable multi-AZ by default', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        MultiAZ: true,
      });
    });

    it('should use PostgreSQL engine', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        Engine: 'postgres',
      });
    });

    it('should not be publicly accessible', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        PubliclyAccessible: false,
      });
    });

    it('should have backup retention', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        BackupRetentionPeriod: 7,
      });
    });
  });

  describe('MySQL RDS Instance', () => {
    let template: Template;

    beforeEach(() => {
      new RdsConstruct(stack, 'TestMysql', {
        instanceName: 'test-mysql',
        vpc,
        engineType: RdsEngineType.MYSQL,
      });

      template = Template.fromStack(stack);
    });

    it('should use MySQL engine', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        Engine: 'mysql',
      });
    });
  });

  describe('MariaDB RDS Instance', () => {
    let template: Template;

    beforeEach(() => {
      new RdsConstruct(stack, 'TestMariaDb', {
        instanceName: 'test-mariadb',
        vpc,
        engineType: RdsEngineType.MARIADB,
      });

      template = Template.fromStack(stack);
    });

    it('should use MariaDB engine', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        Engine: 'mariadb',
      });
    });
  });

  describe('Custom Configuration', () => {
    let template: Template;

    beforeEach(() => {
      new RdsConstruct(stack, 'TestCustom', {
        instanceName: 'test-custom',
        vpc,
        engineType: RdsEngineType.POSTGRES,
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.M5,
          ec2.InstanceSize.LARGE
        ),
        allocatedStorageGb: 200,
        multiAz: false,
        backupRetentionDays: 14,
        defaultDatabaseName: 'customdb',
      });

      template = Template.fromStack(stack);
    });

    it('should use custom instance type', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DBInstanceClass: 'db.m5.large',
      });
    });

    it('should use custom storage size', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        AllocatedStorage: '200',
      });
    });

    it('should disable multi-AZ when specified', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        MultiAZ: false,
      });
    });

    it('should use custom backup retention', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        BackupRetentionPeriod: 14,
      });
    });

    it('should use custom database name', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DBName: 'customdb',
      });
    });
  });

  describe('Security Group Rules', () => {
    it('should allow connections from specified security group', () => {
      const rdsConstruct = new RdsConstruct(stack, 'TestRds', {
        instanceName: 'test-rds',
        vpc,
        engineType: RdsEngineType.POSTGRES,
      });

      const appSg = new ec2.SecurityGroup(stack, 'AppSg', {
        vpc,
        description: 'Application security group',
      });

      rdsConstruct.allowConnectionsFrom(appSg, RdsEngineType.POSTGRES);

      const template = Template.fromStack(stack);
      
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 5432,
        ToPort: 5432,
      });
    });

    it('should use correct port for MySQL', () => {
      const rdsConstruct = new RdsConstruct(stack, 'TestMysql', {
        instanceName: 'test-mysql',
        vpc,
        engineType: RdsEngineType.MYSQL,
      });

      const appSg = new ec2.SecurityGroup(stack, 'AppSg', {
        vpc,
        description: 'Application security group',
      });

      rdsConstruct.allowConnectionsFrom(appSg, RdsEngineType.MYSQL);

      const template = Template.fromStack(stack);
      
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 3306,
        ToPort: 3306,
      });
    });
  });

  describe('Security Requirements', () => {
    let template: Template;

    beforeEach(() => {
      new RdsConstruct(stack, 'TestSecure', {
        instanceName: 'test-secure',
        vpc,
      });

      template = Template.fromStack(stack);
    });

    it('should be in private subnet', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        PubliclyAccessible: false,
      });
    });

    it('should have encryption enabled', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        StorageEncrypted: true,
      });
    });

    it('should have automated backups enabled', () => {
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        BackupRetentionPeriod: 7,
      });
    });

    it('should create a security group', () => {
      template.resourceCountIs('AWS::EC2::SecurityGroup', 1); // RDS SG
    });
  });
});


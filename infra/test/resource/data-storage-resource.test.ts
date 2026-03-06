import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { DataStorageResource } from '../../lib/resource/data-storage-resource';

describe('DataStorageResource', () => {
  describe('DynamoDB Configuration', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let vpc: ec2.Vpc;
    let dataStorageResource: DataStorageResource;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      dataStorageResource = new DataStorageResource(stack, 'TestDataStorage', {
        vpc,
        enableDynamo: true,
        dynamoTableName: 'test-table',
        enableRds: false,
        enableAurora: false,
      });

      template = Template.fromStack(stack);
    });

    it('should create a DynamoDB table', () => {
      template.resourceCountIs('AWS::DynamoDB::Table', 1);
    });

    it('should export dynamoTable property', () => {
      expect(dataStorageResource.dynamoTable).toBeDefined();
    });

    it('should have correct key schema', () => {
      // Default partition key is 'id', no sort key unless specified
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: 'id',
            KeyType: 'HASH',
          }),
        ]),
      });
    });

    it('should use PAY_PER_REQUEST billing mode', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: 'PAY_PER_REQUEST',
      });
    });
  });

  describe('DynamoDB Validation', () => {
    it('should throw error when dynamoTableName is missing', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      expect(() => {
        new DataStorageResource(stack, 'TestDataStorage', {
          vpc,
          enableDynamo: true,
          enableRds: false,
          // dynamoTableName is missing
        });
      }).toThrow('dynamoTableName is required when enableDynamo is true');
    });
  });

  describe('Aurora Configuration', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let vpc: ec2.Vpc;
    let dataStorageResource: DataStorageResource;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      dataStorageResource = new DataStorageResource(stack, 'TestDataStorage', {
        vpc,
        enableDynamo: false,
        enableAurora: true,
        enableRds: false,
        auroraClusterName: 'test-aurora-cluster',
        databaseName: 'testdb',
      });

      template = Template.fromStack(stack);
    });

    it('should create an Aurora cluster', () => {
      template.resourceCountIs('AWS::RDS::DBCluster', 1);
    });

    it('should export auroraCluster property', () => {
      expect(dataStorageResource.auroraCluster).toBeDefined();
    });

    it('should export databaseSecurityGroup property', () => {
      expect(dataStorageResource.databaseSecurityGroup).toBeDefined();
    });

    it('should not create RDS instance', () => {
      expect(dataStorageResource.rdsInstance).toBeUndefined();
    });
  });

  describe('RDS Configuration', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let vpc: ec2.Vpc;
    let dataStorageResource: DataStorageResource;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      dataStorageResource = new DataStorageResource(stack, 'TestDataStorage', {
        vpc,
        enableDynamo: false,
        enableAurora: false,
        enableRds: true,
        rdsInstanceName: 'test-rds-instance',
        engineType: 'postgres',
        databaseName: 'testdb',
      });

      template = Template.fromStack(stack);
    });

    it('should create an RDS instance', () => {
      template.resourceCountIs('AWS::RDS::DBInstance', 1);
    });

    it('should export rdsInstance property', () => {
      expect(dataStorageResource.rdsInstance).toBeDefined();
    });

    it('should export databaseSecurityGroup property', () => {
      expect(dataStorageResource.databaseSecurityGroup).toBeDefined();
    });

    it('should not create Aurora cluster', () => {
      expect(dataStorageResource.auroraCluster).toBeUndefined();
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
  });

  describe('RDS with MySQL', () => {
    it('should use MySQL engine when specified', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      new DataStorageResource(stack, 'TestDataStorage', {
        vpc,
        enableDynamo: false,
        enableAurora: false,
        enableRds: true,
        engineType: 'mysql',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        Engine: 'mysql',
      });
    });
  });

  describe('Helper Methods', () => {
    describe('getDatabaseEndpoint', () => {
      it('should return Aurora cluster endpoint', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack', {
          env: { account: '123456789012', region: 'ap-northeast-1' },
        });
        const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

        const resource = new DataStorageResource(stack, 'TestDataStorage', {
          vpc,
          enableAurora: true,
          enableRds: false,
        });

        const endpoint = resource.getDatabaseEndpoint();
        expect(endpoint).toBeDefined();
      });

      it('should return RDS instance endpoint', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack', {
          env: { account: '123456789012', region: 'ap-northeast-1' },
        });
        const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

        const resource = new DataStorageResource(stack, 'TestDataStorage', {
          vpc,
          enableAurora: false,
          enableRds: true,
        });

        const endpoint = resource.getDatabaseEndpoint();
        expect(endpoint).toBeDefined();
      });

      it('should return undefined when no database is enabled', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack', {
          env: { account: '123456789012', region: 'ap-northeast-1' },
        });
        const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

        const resource = new DataStorageResource(stack, 'TestDataStorage', {
          vpc,
          enableAurora: false,
          enableRds: false,
        });

        const endpoint = resource.getDatabaseEndpoint();
        expect(endpoint).toBeUndefined();
      });
    });

    describe('getDatabasePort', () => {
      it('should return Aurora cluster port', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack', {
          env: { account: '123456789012', region: 'ap-northeast-1' },
        });
        const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

        const resource = new DataStorageResource(stack, 'TestDataStorage', {
          vpc,
          enableAurora: true,
          enableRds: false,
        });

        const port = resource.getDatabasePort();
        expect(port).toBeDefined();
      });

      it('should return RDS instance port', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack', {
          env: { account: '123456789012', region: 'ap-northeast-1' },
        });
        const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

        const resource = new DataStorageResource(stack, 'TestDataStorage', {
          vpc,
          enableAurora: false,
          enableRds: true,
        });

        const port = resource.getDatabasePort();
        expect(port).toBeDefined();
      });
    });

    describe('allowConnectionsFrom', () => {
      it('should add ingress rule to database security group', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack', {
          env: { account: '123456789012', region: 'ap-northeast-1' },
        });
        const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

        const resource = new DataStorageResource(stack, 'TestDataStorage', {
          vpc,
          enableAurora: false,
          enableRds: true,
        });

        const clientSg = new ec2.SecurityGroup(stack, 'ClientSg', { vpc });
        resource.allowConnectionsFrom(clientSg);

        const template = Template.fromStack(stack);
        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
          IpProtocol: 'tcp',
        });
      });
    });
  });

  describe('Default Behavior', () => {
    it('should enable RDS by default', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      const resource = new DataStorageResource(stack, 'TestDataStorage', {
        vpc,
        // All enable* options are default
      });

      expect(resource.rdsInstance).toBeDefined();
      expect(resource.auroraCluster).toBeUndefined();
      expect(resource.dynamoTable).toBeUndefined();
    });
  });

  describe('Combined Configuration', () => {
    it('should create DynamoDB and RDS together', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      const resource = new DataStorageResource(stack, 'TestDataStorage', {
        vpc,
        enableDynamo: true,
        dynamoTableName: 'test-table',
        enableRds: true,
        enableAurora: false,
      });

      expect(resource.dynamoTable).toBeDefined();
      expect(resource.rdsInstance).toBeDefined();
    });
  });
});

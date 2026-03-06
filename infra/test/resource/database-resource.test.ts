import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { DatabaseResource } from '../../lib/resource/database-resource';

describe('DatabaseResource', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.IVpc;
  let databaseResource: DatabaseResource;
  let template: Template;

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

    databaseResource = new DatabaseResource(stack, 'TestDatabase', {
      vpc,
      enableDynamo: true,
      dynamoTableName: 'test-table',
      enableAurora: true,
      enableRds: false,
      engineType: 'postgres',
      auroraClusterName: 'test-cluster',
      s3BucketName: 'test-bucket',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    template = Template.fromStack(stack);
  });

  describe('DynamoDB Table', () => {
    it('should create a DynamoDB table', () => {
      template.resourceCountIs('AWS::DynamoDB::Table', 1);
    });

    it('should export dynamoTable property', () => {
      expect(databaseResource.dynamoTable).toBeDefined();
      expect(databaseResource.dynamoTable!.tableName).toBeDefined();
    });

    it('should have correct key schema', () => {
      // Default partition key is 'id', no sort key unless specified
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [
          {
            AttributeName: 'id',
            KeyType: 'HASH',
          },
        ],
      });
    });
  });

  describe('Aurora Cluster', () => {
    it('should create an Aurora cluster', () => {
      template.resourceCountIs('AWS::RDS::DBCluster', 1);
    });

    it('should export auroraCluster property', () => {
      expect(databaseResource.auroraCluster).toBeDefined();
    });

    it('should have Aurora endpoint', () => {
      expect(databaseResource.auroraCluster?.clusterEndpoint).toBeDefined();
    });

    it('should export database security group', () => {
      expect(databaseResource.databaseSecurityGroup).toBeDefined();
    });
  });

  describe('S3 Bucket', () => {
    it('should create an S3 bucket', () => {
      template.resourceCountIs('AWS::S3::Bucket', 1);
    });

    it('should export s3Bucket property', () => {
      expect(databaseResource.s3Bucket).toBeDefined();
      expect(databaseResource.s3Bucket.bucketName).toBeDefined();
    });

    it('should enable versioning', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });
    });

    it('should block public access', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });
  });

  describe('RDS Instance', () => {
    let rdsApp: cdk.App;
    let rdsStack: cdk.Stack;
    let rdsVpc: ec2.IVpc;
    let rdsResource: DatabaseResource;
    let rdsTemplate: Template;

    beforeEach(() => {
      rdsApp = new cdk.App();
      rdsStack = new cdk.Stack(rdsApp, 'RdsTestStack', {
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      rdsVpc = new ec2.Vpc(rdsStack, 'TestVpc', {
        maxAzs: 2,
      });

      rdsResource = new DatabaseResource(rdsStack, 'TestDatabase', {
        vpc: rdsVpc,
        enableDynamo: false,
        enableAurora: false,
        enableRds: true,
        engineType: 'postgres',
        rdsInstanceName: 'test-rds-instance',
        s3BucketName: 'test-bucket',
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      rdsTemplate = Template.fromStack(rdsStack);
    });

    it('should create an RDS instance', () => {
      rdsTemplate.resourceCountIs('AWS::RDS::DBInstance', 1);
    });

    it('should export rdsInstance property', () => {
      expect(rdsResource.rdsInstance).toBeDefined();
    });

    it('should not create Aurora cluster', () => {
      expect(rdsResource.auroraCluster).toBeUndefined();
    });

    it('should use PostgreSQL engine', () => {
      rdsTemplate.hasResourceProperties('AWS::RDS::DBInstance', {
        Engine: 'postgres',
      });
    });

    it('should not be publicly accessible', () => {
      rdsTemplate.hasResourceProperties('AWS::RDS::DBInstance', {
        PubliclyAccessible: false,
      });
    });

    it('should have storage encryption enabled', () => {
      rdsTemplate.hasResourceProperties('AWS::RDS::DBInstance', {
        StorageEncrypted: true,
      });
    });
  });

  describe('RDS with MySQL', () => {
    it('should use MySQL engine when specified', () => {
      const mysqlApp = new cdk.App();
      const mysqlStack = new cdk.Stack(mysqlApp, 'MysqlTestStack', {
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      const mysqlVpc = new ec2.Vpc(mysqlStack, 'TestVpc', { maxAzs: 2 });

      new DatabaseResource(mysqlStack, 'TestDatabase', {
        vpc: mysqlVpc,
        enableDynamo: false,
        enableAurora: false,
        enableRds: true,
        engineType: 'mysql',
        s3BucketName: 'test-bucket',
      });

      const mysqlTemplate = Template.fromStack(mysqlStack);
      mysqlTemplate.hasResourceProperties('AWS::RDS::DBInstance', {
        Engine: 'mysql',
      });
    });
  });

  describe('Helper Methods', () => {
    describe('getDatabaseEndpoint', () => {
      it('should return Aurora cluster endpoint', () => {
        const endpoint = databaseResource.getDatabaseEndpoint();
        expect(endpoint).toBeDefined();
      });

      it('should return RDS instance endpoint', () => {
        const rdsApp = new cdk.App();
        const rdsStack = new cdk.Stack(rdsApp, 'RdsTestStack', {
          env: { account: '123456789012', region: 'ap-northeast-1' },
        });
        const rdsVpc = new ec2.Vpc(rdsStack, 'TestVpc', { maxAzs: 2 });

        const resource = new DatabaseResource(rdsStack, 'TestDatabase', {
          vpc: rdsVpc,
          enableAurora: false,
          enableRds: true,
          s3BucketName: 'test-bucket',
        });

        const endpoint = resource.getDatabaseEndpoint();
        expect(endpoint).toBeDefined();
      });

      it('should return undefined when no database is enabled', () => {
        const noDbApp = new cdk.App();
        const noDbStack = new cdk.Stack(noDbApp, 'NoDbTestStack', {
          env: { account: '123456789012', region: 'ap-northeast-1' },
        });
        const noDbVpc = new ec2.Vpc(noDbStack, 'TestVpc', { maxAzs: 2 });

        const resource = new DatabaseResource(noDbStack, 'TestDatabase', {
          vpc: noDbVpc,
          enableAurora: false,
          enableRds: false,
          s3BucketName: 'test-bucket',
        });

        const endpoint = resource.getDatabaseEndpoint();
        expect(endpoint).toBeUndefined();
      });
    });

    describe('getDatabasePort', () => {
      it('should return Aurora cluster port', () => {
        const port = databaseResource.getDatabasePort();
        expect(port).toBeDefined();
      });

      it('should return RDS instance port', () => {
        const rdsApp = new cdk.App();
        const rdsStack = new cdk.Stack(rdsApp, 'RdsTestStack', {
          env: { account: '123456789012', region: 'ap-northeast-1' },
        });
        const rdsVpc = new ec2.Vpc(rdsStack, 'TestVpc', { maxAzs: 2 });

        const resource = new DatabaseResource(rdsStack, 'TestDatabase', {
          vpc: rdsVpc,
          enableAurora: false,
          enableRds: true,
          s3BucketName: 'test-bucket',
        });

        const port = resource.getDatabasePort();
        expect(port).toBeDefined();
      });
    });

    describe('allowConnectionsFrom', () => {
      it('should add ingress rule to database security group', () => {
        const connApp = new cdk.App();
        const connStack = new cdk.Stack(connApp, 'ConnTestStack', {
          env: { account: '123456789012', region: 'ap-northeast-1' },
        });
        const connVpc = new ec2.Vpc(connStack, 'TestVpc', { maxAzs: 2 });

        const resource = new DatabaseResource(connStack, 'TestDatabase', {
          vpc: connVpc,
          enableAurora: false,
          enableRds: true,
          s3BucketName: 'test-bucket',
        });

        const clientSg = new ec2.SecurityGroup(connStack, 'ClientSg', {
          vpc: connVpc,
        });
        resource.allowConnectionsFrom(clientSg);

        const connTemplate = Template.fromStack(connStack);
        connTemplate.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
          IpProtocol: 'tcp',
        });
      });
    });
  });

  describe('DynamoDB Validation', () => {
    it('should throw error when dynamoTableName is missing', () => {
      const validationApp = new cdk.App();
      const validationStack = new cdk.Stack(validationApp, 'ValidationStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const validationVpc = new ec2.Vpc(validationStack, 'TestVpc', {
        maxAzs: 2,
      });

      expect(() => {
        new DatabaseResource(validationStack, 'TestDatabase', {
          vpc: validationVpc,
          enableDynamo: true,
          enableRds: false,
          s3BucketName: 'test-bucket',
          // dynamoTableName is missing
        });
      }).toThrow('dynamoTableName is required when enableDynamo is true');
    });
  });
});


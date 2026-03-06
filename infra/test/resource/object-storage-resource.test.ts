import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ObjectStorageResource } from '../../lib/resource/object-storage-resource';

describe('ObjectStorageResource', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let objectStorageResource: ObjectStorageResource;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');

    objectStorageResource = new ObjectStorageResource(
      stack,
      'TestObjectStorage',
      {
        bucketName: 'test-storage-bucket',
      }
    );

    template = Template.fromStack(stack);
  });

  describe('S3 Bucket', () => {
    it('should create an S3 bucket', () => {
      template.resourceCountIs('AWS::S3::Bucket', 1);
    });

    it('should export bucket property', () => {
      expect(objectStorageResource.bucket).toBeDefined();
      expect(objectStorageResource.bucket.bucketName).toBeDefined();
    });
  });

  describe('Security Configuration', () => {
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

    it('should enable server-side encryption', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: Match.arrayWith([
            Match.objectLike({
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            }),
          ]),
        },
      });
    });
  });

  describe('Versioning', () => {
    it('should enable versioning by default', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });
    });

    it('should disable versioning when specified', () => {
      const appNoVersion = new cdk.App();
      const stackNoVersion = new cdk.Stack(appNoVersion, 'TestStackNoVersion');

      new ObjectStorageResource(stackNoVersion, 'TestObjectStorage', {
        bucketName: 'test-storage-bucket',
        versioned: false,
      });

      const templateNoVersion = Template.fromStack(stackNoVersion);

      // Check that versioning is not enabled
      const buckets = templateNoVersion.findResources('AWS::S3::Bucket');
      const bucketKey = Object.keys(buckets)[0];

      // VersioningConfiguration should be undefined or not have Status: 'Enabled'
      const versionConfig =
        buckets[bucketKey].Properties.VersioningConfiguration;
      if (versionConfig) {
        expect(versionConfig.Status).not.toBe('Enabled');
      }
    });
  });

  describe('Removal Policy', () => {
    it('should use RETAIN removal policy by default', () => {
      // S3Construct defaults to RETAIN for production safety
      const buckets = template.findResources('AWS::S3::Bucket');
      const bucketKey = Object.keys(buckets)[0];
      expect(buckets[bucketKey].DeletionPolicy).toBe('Retain');
    });

    it('should use DESTROY removal policy when specified', () => {
      const appDestroy = new cdk.App();
      const stackDestroy = new cdk.Stack(appDestroy, 'TestStackDestroy');

      new ObjectStorageResource(stackDestroy, 'TestObjectStorage', {
        bucketName: 'test-storage-bucket',
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      const templateDestroy = Template.fromStack(stackDestroy);
      const buckets = templateDestroy.findResources('AWS::S3::Bucket');
      const bucketKey = Object.keys(buckets)[0];
      expect(buckets[bucketKey].DeletionPolicy).toBe('Delete');
    });
  });
});

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { RemovalPolicy } from 'aws-cdk-lib';
import { EcrConstruct } from '../../../lib/construct/compute/ecr-construct';

describe('EcrConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  describe('Default Configuration', () => {
    let template: Template;

    beforeEach(() => {
      new EcrConstruct(stack, 'TestEcr', {
        repositoryName: 'test-repo',
      });
      template = Template.fromStack(stack);
    });

    it('should create an ECR repository', () => {
      template.resourceCountIs('AWS::ECR::Repository', 1);
    });

    it('should have correct repository name', () => {
      template.hasResourceProperties('AWS::ECR::Repository', {
        RepositoryName: 'test-repo',
      });
    });

    it('should enable image scan on push by default', () => {
      template.hasResourceProperties('AWS::ECR::Repository', {
        ImageScanningConfiguration: {
          ScanOnPush: true,
        },
      });
    });

    it('should have IMMUTABLE tag mutability by default', () => {
      template.hasResourceProperties('AWS::ECR::Repository', {
        ImageTagMutability: 'IMMUTABLE',
      });
    });

    it('should use default AES256 encryption (not explicitly in template)', () => {
      // AES256 is the default encryption, so it's not explicitly in the CloudFormation template
      // We verify no KMS key is configured (which would indicate non-default encryption)
      template.hasResourceProperties('AWS::ECR::Repository', {
        RepositoryName: 'test-repo',
      });
      // Verify no explicit encryption configuration (default AES256 is used)
      const resources = template.findResources('AWS::ECR::Repository');
      const repoKeys = Object.keys(resources);
      expect(repoKeys.length).toBe(1);
      const repoProps = resources[repoKeys[0]].Properties;
      expect(repoProps.EncryptionConfiguration).toBeUndefined();
    });

    it('should have RETAIN removal policy by default', () => {
      template.hasResource('AWS::ECR::Repository', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });

    it('should have lifecycle policy', () => {
      template.hasResourceProperties('AWS::ECR::Repository', {
        LifecyclePolicy: Match.objectLike({
          LifecyclePolicyText: Match.anyValue(),
        }),
      });
    });
  });

  describe('Custom Configuration', () => {
    it('should allow MUTABLE tag mutability', () => {
      new EcrConstruct(stack, 'TestEcr', {
        repositoryName: 'test-repo',
        imageTagMutability: require('aws-cdk-lib/aws-ecr').TagMutability.MUTABLE,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ECR::Repository', {
        ImageTagMutability: 'MUTABLE',
      });
    });

    it('should disable image scan when specified', () => {
      new EcrConstruct(stack, 'TestEcr', {
        repositoryName: 'test-repo',
        imageScanOnPush: false,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ECR::Repository', {
        ImageScanningConfiguration: {
          ScanOnPush: false,
        },
      });
    });

    it('should set DESTROY removal policy when specified', () => {
      new EcrConstruct(stack, 'TestEcr', {
        repositoryName: 'test-repo',
        removalPolicy: RemovalPolicy.DESTROY,
      });
      const template = Template.fromStack(stack);

      template.hasResource('AWS::ECR::Repository', {
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      });
    });

    it('should enable emptyOnDelete when DESTROY and specified', () => {
      new EcrConstruct(stack, 'TestEcr', {
        repositoryName: 'test-repo',
        removalPolicy: RemovalPolicy.DESTROY,
        emptyOnDelete: true,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ECR::Repository', {
        EmptyOnDelete: true,
      });
    });
  });

  describe('Construct Properties', () => {
    it('should expose repository property', () => {
      const construct = new EcrConstruct(stack, 'TestEcr', {
        repositoryName: 'test-repo',
      });

      expect(construct.repository).toBeDefined();
    });
  });
});

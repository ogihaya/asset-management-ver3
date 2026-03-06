import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FrontendStack } from '../../lib/stack/frontend/frontend-stack';
import { testConfig } from '../test-config';

describe('FrontendStack', () => {
  describe('Amplify Mode (testConfig default)', () => {
    let app: cdk.App;
    let stack: FrontendStack;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();
      stack = new FrontendStack(
        app,
        'TestFrontendStack',
        testConfig,
        {
          backendApiUrl: 'https://api.example.com',
          repositoryOwner: 'test-org',
          repositoryName: 'test-repo',
          mainBranch: 'main',
          env: {
            account: '123456789012',
            region: 'ap-northeast-1',
          },
        }
      );
      template = Template.fromStack(stack);
    });

    describe('Amplify App', () => {
      it('should create an Amplify App', () => {
        template.resourceCountIs('AWS::Amplify::App', 1);
      });

      it('should export amplifyApp property', () => {
        expect(stack.amplifyApp).toBeDefined();
      });

      it('should use WEB_COMPUTE platform', () => {
        template.hasResourceProperties('AWS::Amplify::App', {
          Platform: 'WEB_COMPUTE',
        });
      });

      it('should not create S3 bucket', () => {
        expect(stack.bucket).toBeUndefined();
      });

      it('should not create CloudFront distribution', () => {
        expect(stack.distribution).toBeUndefined();
      });
    });

    describe('Outputs', () => {
      it('should export Frontend URL', () => {
        const outputs = template.findOutputs('*');
        expect(Object.keys(outputs)).toContain('FrontendUrl');
      });

      it('should export Amplify App ID (from AmplifyConstruct)', () => {
        const outputs = template.findOutputs('*');
        // AmplifyConstruct outputs the App ID internally
        const outputKeys = Object.keys(outputs);
        const hasAmplifyAppId = outputKeys.some(key => key.includes('AmplifyAppId'));
        expect(hasAmplifyAppId).toBe(true);
      });
    });

    describe('Stack Properties', () => {
      it('should synthesize successfully', () => {
        expect(() => app.synth()).not.toThrow();
      });
    });
  });

  describe('S3 + CloudFront Mode', () => {
    let app: cdk.App;
    let stack: FrontendStack;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();
      // Create a modified config with s3-cloudfront type
      const s3CloudFrontConfig = {
        ...testConfig,
        frontend: {
          ...testConfig.frontend,
          type: 's3-cloudfront' as const,
        },
      };

      stack = new FrontendStack(
        app,
        'TestFrontendStack',
        s3CloudFrontConfig,
        {
          backendApiUrl: 'https://api.example.com',
          env: {
            account: '123456789012',
            region: 'ap-northeast-1',
          },
        }
      );
      template = Template.fromStack(stack);
    });

    describe('S3 Bucket', () => {
      it('should create an S3 bucket', () => {
        template.resourceCountIs('AWS::S3::Bucket', 1);
      });

      it('should export bucket property', () => {
        expect(stack.bucket).toBeDefined();
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

    describe('CloudFront Distribution', () => {
      it('should create a CloudFront distribution', () => {
        template.resourceCountIs('AWS::CloudFront::Distribution', 1);
      });

      it('should export distribution property', () => {
        expect(stack.distribution).toBeDefined();
      });

      it('should have correct default root object', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            DefaultRootObject: 'index.html',
          }),
        });
      });
    });

    describe('Outputs', () => {
      it('should export Frontend URL', () => {
        const outputs = template.findOutputs('*');
        expect(Object.keys(outputs)).toContain('FrontendUrl');
      });

      it('should export Frontend Bucket Name', () => {
        const outputs = template.findOutputs('*');
        expect(Object.keys(outputs)).toContain('FrontendBucketName');
      });

      it('should export Distribution ID', () => {
        const outputs = template.findOutputs('*');
        expect(Object.keys(outputs)).toContain('DistributionId');
      });
    });

    describe('Stack Properties', () => {
      it('should synthesize successfully', () => {
        expect(() => app.synth()).not.toThrow();
      });
    });
  });
});

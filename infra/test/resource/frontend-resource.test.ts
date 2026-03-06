import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FrontendResource } from '../../lib/resource/frontend-resource';
import { AmplifyConstruct } from '../../lib/construct/hosting/amplify-construct';

describe('FrontendResource', () => {
  describe('S3 + CloudFront Mode', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let frontendResource: FrontendResource;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack');

      frontendResource = new FrontendResource(stack, 'TestFrontend', {
        type: 's3-cloudfront',
        bucketName: 'test-frontend-bucket',
        comment: 'Test frontend distribution',
        spaMode: true,
      });

      template = Template.fromStack(stack);
    });

    describe('S3 Bucket', () => {
      it('should create an S3 bucket', () => {
        template.resourceCountIs('AWS::S3::Bucket', 1);
      });

      it('should export bucket property', () => {
        expect(frontendResource.bucket).toBeDefined();
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

      it('should enable versioning', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
          VersioningConfiguration: {
            Status: 'Enabled',
          },
        });
      });
    });

    describe('CloudFront Distribution', () => {
      it('should create a CloudFront distribution', () => {
        template.resourceCountIs('AWS::CloudFront::Distribution', 1);
      });

      it('should export distribution property', () => {
        expect(frontendResource.distribution).toBeDefined();
      });

      it('should have default root object', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            DefaultRootObject: 'index.html',
          }),
        });
      });

      it('should have correct comment', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            Comment: 'Test frontend distribution',
          }),
        });
      });
    });

    describe('SPA Mode', () => {
      it('should have custom error responses for SPA routing', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            CustomErrorResponses: Match.arrayWith([
              Match.objectLike({
                ErrorCode: 403,
                ResponseCode: 200,
                ResponsePagePath: '/index.html',
              }),
              Match.objectLike({
                ErrorCode: 404,
                ResponseCode: 200,
                ResponsePagePath: '/index.html',
              }),
            ]),
          }),
        });
      });
    });

    describe('Origin Access', () => {
      it('should create Origin Access Control', () => {
        // May create multiple OACs depending on configuration
        const oacs = template.findResources('AWS::CloudFront::OriginAccessControl');
        expect(Object.keys(oacs).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('S3 + CloudFront Mode - SPA disabled', () => {
    it('should not have custom error responses when spaMode is false', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');

      new FrontendResource(stack, 'TestFrontend', {
        type: 's3-cloudfront',
        bucketName: 'test-frontend-bucket',
        spaMode: false,
      });

      const template = Template.fromStack(stack);

      // Get the distribution config
      const distributions = template.findResources(
        'AWS::CloudFront::Distribution'
      );
      const distKey = Object.keys(distributions)[0];
      const distConfig =
        distributions[distKey].Properties.DistributionConfig;

      // CustomErrorResponses should be undefined or not contain SPA redirects
      if (distConfig.CustomErrorResponses) {
        const hasSpaRedirect = distConfig.CustomErrorResponses.some(
          (resp: any) => resp.ResponsePagePath === '/index.html'
        );
        expect(hasSpaRedirect).toBe(false);
      }
    });
  });

  describe('Removal Policy', () => {
    it('should use DESTROY removal policy by default', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');

      new FrontendResource(stack, 'TestFrontend', {
        type: 's3-cloudfront',
        bucketName: 'test-frontend-bucket',
      });

      const template = Template.fromStack(stack);

      // Check that bucket has DeletionPolicy: Delete
      const buckets = template.findResources('AWS::S3::Bucket');
      const bucketKey = Object.keys(buckets)[0];
      expect(buckets[bucketKey].DeletionPolicy).toBe('Delete');
    });

    it('should use RETAIN removal policy when specified', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');

      new FrontendResource(stack, 'TestFrontend', {
        type: 's3-cloudfront',
        bucketName: 'test-frontend-bucket',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });

      const template = Template.fromStack(stack);

      // Check that bucket has DeletionPolicy: Retain
      const buckets = template.findResources('AWS::S3::Bucket');
      const bucketKey = Object.keys(buckets)[0];
      expect(buckets[bucketKey].DeletionPolicy).toBe('Retain');
    });
  });
});

describe('AmplifyConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let amplifyConstruct: AmplifyConstruct;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');

    amplifyConstruct = new AmplifyConstruct(stack, 'TestAmplify', {
      appName: 'test-amplify-app',
      repositoryOwner: 'test-owner',
      repositoryName: 'test-repo',
      mainBranch: 'main',
      environmentVariables: {
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
      },
    });

    template = Template.fromStack(stack);
  });

  describe('Amplify App', () => {
    it('should create an Amplify App', () => {
      template.resourceCountIs('AWS::Amplify::App', 1);
    });

    it('should export app property', () => {
      expect(amplifyConstruct.app).toBeDefined();
    });

    it('should have correct name', () => {
      template.hasResourceProperties('AWS::Amplify::App', {
        Name: 'test-amplify-app',
      });
    });

    it('should use WEB_COMPUTE platform for Next.js SSR', () => {
      template.hasResourceProperties('AWS::Amplify::App', {
        Platform: 'WEB_COMPUTE',
      });
    });

    it('should have full GitHub repository URL', () => {
      template.hasResourceProperties('AWS::Amplify::App', {
        Repository: 'https://github.com/test-owner/test-repo',
      });
    });

    it('should have environment variables', () => {
      template.hasResourceProperties('AWS::Amplify::App', {
        EnvironmentVariables: Match.arrayWith([
          Match.objectLike({
            Name: 'NEXT_PUBLIC_API_URL',
            Value: 'https://api.example.com',
          }),
        ]),
      });
    });
  });

  describe('Amplify Branch', () => {
    it('should create an Amplify Branch', () => {
      template.resourceCountIs('AWS::Amplify::Branch', 1);
    });

    it('should export branch property', () => {
      expect(amplifyConstruct.branch).toBeDefined();
    });

    it('should have correct branch name', () => {
      template.hasResourceProperties('AWS::Amplify::Branch', {
        BranchName: 'main',
      });
    });

    it('should have PRODUCTION stage', () => {
      template.hasResourceProperties('AWS::Amplify::Branch', {
        Stage: 'PRODUCTION',
      });
    });
  });

  describe('Default Domain', () => {
    it('should export defaultDomain property', () => {
      expect(amplifyConstruct.defaultDomain).toBeDefined();
    });
  });
});

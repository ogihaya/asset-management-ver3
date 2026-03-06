import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import {
  WafConstruct,
  WafRuleType,
  WafAlbAssociation,
} from '../../../lib/construct/security/waf-construct';

describe('WafConstruct', () => {
  describe('Default Configuration', () => {
    let template: Template;
    let construct: WafConstruct;

    beforeEach(() => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');

      construct = new WafConstruct(stack, 'TestWaf', {
        name: 'test-waf',
        scope: 'REGIONAL',
      });

      template = Template.fromStack(stack);
    });

    it('should create a WebACL', () => {
      template.resourceCountIs('AWS::WAFv2::WebACL', 1);
    });

    it('should export webAcl property', () => {
      expect(construct.webAcl).toBeDefined();
    });

    it('should export webAclArn property', () => {
      expect(construct.webAclArn).toBeDefined();
    });

    it('should have correct name', () => {
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Name: 'test-waf',
      });
    });

    it('should have REGIONAL scope', () => {
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Scope: 'REGIONAL',
      });
    });

    it('should have allow as default action', () => {
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        DefaultAction: { Allow: {} },
      });
    });

    it('should enable CloudWatch metrics by default', () => {
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        VisibilityConfig: Match.objectLike({
          CloudWatchMetricsEnabled: true,
          MetricName: 'test-waf-metric',
          SampledRequestsEnabled: true,
        }),
      });
    });
  });

  describe('Default Managed Rules', () => {
    let template: Template;

    beforeEach(() => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');

      new WafConstruct(stack, 'TestWaf', {
        name: 'test-waf',
        scope: 'REGIONAL',
      });

      template = Template.fromStack(stack);
    });

    it('should include Common Rule Set', () => {
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWS-AWSManagedRulesCommonRuleSet',
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesCommonRuleSet',
              },
            },
          }),
        ]),
      });
    });

    it('should include Known Bad Inputs Rule Set', () => {
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesKnownBadInputsRuleSet',
              },
            },
          }),
        ]),
      });
    });

    it('should include SQLi Rule Set', () => {
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWS-AWSManagedRulesSQLiRuleSet',
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesSQLiRuleSet',
              },
            },
          }),
        ]),
      });
    });

    it('should include IP Reputation Rule Set', () => {
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWS-AWSManagedRulesAmazonIpReputationList',
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesAmazonIpReputationList',
              },
            },
          }),
        ]),
      });
    });
  });

  describe('Rate Limit Rule', () => {
    it('should include rate limit rule by default', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');

      new WafConstruct(stack, 'TestWaf', {
        name: 'test-waf',
        scope: 'REGIONAL',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'RateLimitRule',
            Action: { Block: {} },
            Statement: {
              RateBasedStatement: {
                Limit: 2000,
                AggregateKeyType: 'IP',
              },
            },
          }),
        ]),
      });
    });

    it('should use custom rate limit', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');

      new WafConstruct(stack, 'TestWaf', {
        name: 'test-waf',
        scope: 'REGIONAL',
        rateLimit: 5000,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'RateLimitRule',
            Statement: {
              RateBasedStatement: {
                Limit: 5000,
              },
            },
          }),
        ]),
      });
    });

    it('should not include rate limit rule when disabled', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');

      new WafConstruct(stack, 'TestWaf', {
        name: 'test-waf',
        scope: 'REGIONAL',
        enableRateLimit: false,
      });

      const template = Template.fromStack(stack);
      const webAcls = template.findResources('AWS::WAFv2::WebACL');
      const webAclKey = Object.keys(webAcls)[0];
      const rules = webAcls[webAclKey].Properties.Rules;

      const hasRateLimitRule = rules.some(
        (rule: any) => rule.Name === 'RateLimitRule'
      );
      expect(hasRateLimitRule).toBe(false);
    });
  });

  describe('Custom Managed Rules', () => {
    it('should use custom managed rules when specified', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');

      new WafConstruct(stack, 'TestWaf', {
        name: 'test-waf',
        scope: 'REGIONAL',
        managedRules: [WafRuleType.COMMON, WafRuleType.BOT_CONTROL],
      });

      const template = Template.fromStack(stack);

      // Should have Common Rule Set
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWS-AWSManagedRulesCommonRuleSet',
          }),
        ]),
      });

      // Should have Bot Control
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWS-AWSManagedRulesBotControlRuleSet',
          }),
        ]),
      });
    });
  });

  describe('CloudFront Scope', () => {
    it('should support CLOUDFRONT scope', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { region: 'us-east-1' },
      });

      new WafConstruct(stack, 'TestWaf', {
        name: 'cloudfront-waf',
        scope: 'CLOUDFRONT',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Scope: 'CLOUDFRONT',
      });
    });
  });

  describe('Metrics Configuration', () => {
    it('should disable CloudWatch metrics when specified', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');

      new WafConstruct(stack, 'TestWaf', {
        name: 'test-waf',
        scope: 'REGIONAL',
        enableCloudWatchMetrics: false,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        VisibilityConfig: Match.objectLike({
          CloudWatchMetricsEnabled: false,
        }),
      });
    });

    it('should disable sampled requests when specified', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');

      new WafConstruct(stack, 'TestWaf', {
        name: 'test-waf',
        scope: 'REGIONAL',
        enableSampledRequests: false,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        VisibilityConfig: Match.objectLike({
          SampledRequestsEnabled: false,
        }),
      });
    });
  });
});

describe('WafAlbAssociation', () => {
  it('should create a WebACL association', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    new WafAlbAssociation(stack, 'TestAssociation', {
      webAclArn: 'arn:aws:wafv2:ap-northeast-1:123456789012:regional/webacl/test/xxx',
      albArn: 'arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:loadbalancer/app/test/xxx',
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::WAFv2::WebACLAssociation', 1);
  });

  it('should have correct ARN references', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    const webAclArn = 'arn:aws:wafv2:ap-northeast-1:123456789012:regional/webacl/test/xxx';
    const albArn = 'arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:loadbalancer/app/test/xxx';

    new WafAlbAssociation(stack, 'TestAssociation', {
      webAclArn,
      albArn,
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::WAFv2::WebACLAssociation', {
      WebACLArn: webAclArn,
      ResourceArn: albArn,
    });
  });
});

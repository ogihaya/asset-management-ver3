import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { IntegrationStack } from '../../lib/stack/integration/integration-stack';
import { testConfig } from '../test-config';
import { EnvironmentConfig } from '../../config/environment';

describe('IntegrationStack', () => {
  let app: cdk.App;
  let stack: IntegrationStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new IntegrationStack(
      app,
      'TestIntegrationStack',
      testConfig,
      {
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      }
    );
    template = Template.fromStack(stack);
  });

  describe('SNS Topic', () => {
    it('should create an SNS topic', () => {
      template.resourceCountIs('AWS::SNS::Topic', 1);
    });

    it('should have correct display name', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        DisplayName: `${testConfig.envName}-cdk-template-topic`,
      });
    });
  });

  describe('SQS Queue', () => {
    it('should create main SQS queue and DLQ', () => {
      template.resourceCountIs('AWS::SQS::Queue', 2); // Main queue + DLQ
    });

    it('should have visibility timeout configured', () => {
      // Default visibility timeout is 30 seconds
      template.hasResourceProperties('AWS::SQS::Queue', {
        VisibilityTimeout: 30,
      });
    });

    it('should have retention period configured', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        MessageRetentionPeriod: 1209600, // 14 days
      });
    });
  });

  describe('Dead Letter Queue', () => {
    it('should configure main queue to use DLQ', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        RedrivePolicy: {
          deadLetterTargetArn: {
            'Fn::GetAtt': Match.anyValue(),
          },
          maxReceiveCount: 3,
        },
      });
    });
  });

  describe('SNS to SQS Subscription', () => {
    it('should subscribe SQS to SNS', () => {
      template.resourceCountIs('AWS::SNS::Subscription', 1);
    });

    it('should use SQS protocol', () => {
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'sqs',
      });
    });
  });

  describe('Queue Policy', () => {
    it('should create a queue policy', () => {
      template.resourceCountIs('AWS::SQS::QueuePolicy', 1);
    });

    it('should allow SNS to send messages', () => {
      template.hasResourceProperties('AWS::SQS::QueuePolicy', {
        PolicyDocument: {
          Statement: [
            {
              Action: 'sqs:SendMessage',
              Effect: 'Allow',
              Principal: {
                Service: 'sns.amazonaws.com',
              },
            },
          ],
        },
      });
    });
  });

  describe('Outputs', () => {
    it('should export Topic ARN', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('TopicArn');
    });

    it('should export Queue URL', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('QueueUrl');
    });

    it('should export DLQ URL', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toContain('DlqUrl');
    });
  });

  describe('SES Resources (when disabled)', () => {
    it('should not create SES resources when ses config is not provided', () => {
      template.resourceCountIs('AWS::SES::EmailIdentity', 0);
      template.resourceCountIs('AWS::SES::Template', 0);
    });

    it('should not expose emailIdentity when disabled', () => {
      expect(stack.emailIdentity).toBeUndefined();
    });

    it('should not expose emailTemplates when disabled', () => {
      expect(stack.emailTemplates).toBeUndefined();
    });
  });

  describe('SES Resources (when enabled)', () => {
    let sesApp: cdk.App;
    let sesStack: IntegrationStack;
    let sesTemplate: Template;

    const sesConfig: EnvironmentConfig = {
      ...testConfig,
      ses: {
        enabled: true,
        identity: 'test@example.com',
        identityType: 'email',
        templates: [
          {
            templateName: 'welcome',
            subjectPart: 'Welcome {{name}}',
            htmlPart: '<h1>Welcome</h1>',
            textPart: 'Welcome',
          },
        ],
      },
    };

    beforeEach(() => {
      sesApp = new cdk.App();
      sesStack = new IntegrationStack(
        sesApp,
        'TestIntegrationStackWithSes',
        sesConfig,
        {
          env: {
            account: '123456789012',
            region: 'ap-northeast-1',
          },
        }
      );
      sesTemplate = Template.fromStack(sesStack);
    });

    it('should create an SES Email Identity', () => {
      sesTemplate.resourceCountIs('AWS::SES::EmailIdentity', 1);
    });

    it('should have correct email identity', () => {
      sesTemplate.hasResourceProperties('AWS::SES::EmailIdentity', {
        EmailIdentity: 'test@example.com',
      });
    });

    it('should create SES templates', () => {
      sesTemplate.resourceCountIs('AWS::SES::Template', 1);
    });

    it('should have template with environment prefix', () => {
      sesTemplate.hasResourceProperties('AWS::SES::Template', {
        Template: Match.objectLike({
          TemplateName: `${testConfig.envName}-cdk-template-welcome`,
        }),
      });
    });

    it('should export SES Identity output', () => {
      const outputs = sesTemplate.findOutputs('*');
      expect(Object.keys(outputs)).toContain('SesIdentity');
    });

    it('should expose emailIdentity property', () => {
      expect(sesStack.emailIdentity).toBeDefined();
    });

    it('should expose emailTemplates property', () => {
      expect(sesStack.emailTemplates).toBeDefined();
      expect(sesStack.emailTemplates).toHaveLength(1);
    });

    it('should synthesize successfully with SES', () => {
      expect(() => sesApp.synth()).not.toThrow();
    });
  });

  describe('Stack Properties', () => {
    it('should synthesize successfully', () => {
      expect(() => app.synth()).not.toThrow();
    });
  });
});

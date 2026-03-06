import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { EmailResource } from '../../lib/resource/email-resource';

describe('EmailResource', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  describe('With identity and templates', () => {
    let emailResource: EmailResource;
    let template: Template;

    beforeEach(() => {
      emailResource = new EmailResource(stack, 'TestEmail', {
        identityValue: 'test@example.com',
        identityType: 'email',
        templates: [
          {
            templateName: 'welcome',
            subjectPart: 'Welcome {{name}}',
            htmlPart: '<h1>Welcome</h1>',
            textPart: 'Welcome',
          },
        ],
      });
      template = Template.fromStack(stack);
    });

    it('should create an SES Email Identity', () => {
      template.resourceCountIs('AWS::SES::EmailIdentity', 1);
    });

    it('should have correct email identity', () => {
      template.hasResourceProperties('AWS::SES::EmailIdentity', {
        EmailIdentity: 'test@example.com',
      });
    });

    it('should export emailIdentity property', () => {
      expect(emailResource.emailIdentity).toBeDefined();
    });

    it('should create SES templates', () => {
      template.resourceCountIs('AWS::SES::Template', 1);
    });

    it('should export templates property', () => {
      expect(emailResource.templates).toBeDefined();
      expect(emailResource.templates).toHaveLength(1);
    });
  });

  describe('With identity only (no templates)', () => {
    let emailResource: EmailResource;
    let template: Template;

    beforeEach(() => {
      emailResource = new EmailResource(stack, 'TestEmailNoTemplates', {
        identityValue: 'noreply@example.com',
      });
      template = Template.fromStack(stack);
    });

    it('should create an SES Email Identity', () => {
      template.resourceCountIs('AWS::SES::EmailIdentity', 1);
    });

    it('should not create SES templates', () => {
      template.resourceCountIs('AWS::SES::Template', 0);
    });

    it('should have empty templates array', () => {
      expect(emailResource.templates).toHaveLength(0);
    });
  });

  describe('Domain identity', () => {
    it('should support domain identity type', () => {
      new EmailResource(stack, 'TestDomainEmail', {
        identityValue: 'example.com',
        identityType: 'domain',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SES::EmailIdentity', {
        EmailIdentity: 'example.com',
      });
    });
  });
});

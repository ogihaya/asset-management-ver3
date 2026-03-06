import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SesIdentityConstruct } from '../../../lib/construct/messaging/ses-identity-construct';

describe('SesIdentityConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  describe('Email Identity', () => {
    let template: Template;

    beforeEach(() => {
      new SesIdentityConstruct(stack, 'TestSesIdentity', {
        identity: 'test@example.com',
        identityType: 'email',
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
  });

  describe('Domain Identity', () => {
    let template: Template;

    beforeEach(() => {
      new SesIdentityConstruct(stack, 'TestSesDomain', {
        identity: 'example.com',
        identityType: 'domain',
      });
      template = Template.fromStack(stack);
    });

    it('should create an SES Email Identity for domain', () => {
      template.resourceCountIs('AWS::SES::EmailIdentity', 1);
    });

    it('should have correct domain identity', () => {
      template.hasResourceProperties('AWS::SES::EmailIdentity', {
        EmailIdentity: 'example.com',
      });
    });
  });

  describe('Default identity type', () => {
    it('should default to email identity type', () => {
      new SesIdentityConstruct(stack, 'TestSesDefault', {
        identity: 'default@example.com',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SES::EmailIdentity', {
        EmailIdentity: 'default@example.com',
      });
    });
  });

  describe('Exported properties', () => {
    it('should export emailIdentity property', () => {
      const construct = new SesIdentityConstruct(stack, 'TestSes', {
        identity: 'test@example.com',
      });
      expect(construct.emailIdentity).toBeDefined();
    });
  });
});

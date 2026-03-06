import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SecurityResource } from '../../lib/resource/security-resource';

describe('SecurityResource', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  describe('Default Configuration (SMS disabled)', () => {
    let securityResource: SecurityResource;
    let template: Template;

    beforeEach(() => {
      securityResource = new SecurityResource(stack, 'TestSecurity', {
        userPoolName: 'test-pool',
        userPoolClientName: 'test-client',
        secretName: 'test/secrets',
      });
      template = Template.fromStack(stack);
    });

    describe('Cognito User Pool', () => {
      it('should create a Cognito User Pool', () => {
        template.resourceCountIs('AWS::Cognito::UserPool', 1);
      });

      it('should export userPool property', () => {
        expect(securityResource.userPool).toBeDefined();
      });

      it('should have email sign-in enabled', () => {
        template.hasResourceProperties('AWS::Cognito::UserPool', {
          AliasAttributes: Match.arrayWith(['email']),
        });
      });

      it('should not create SMS IAM role', () => {
        // SMS無効時はCognito SMS用のIAMロールは作成されない
        const roles = template.findResources('AWS::IAM::Role', {
          Properties: {
            AssumeRolePolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Principal: {
                    Service: 'cognito-idp.amazonaws.com',
                  },
                }),
              ]),
            },
          },
        });
        expect(Object.keys(roles).length).toBe(0);
      });
    });

    describe('Cognito User Pool Client', () => {
      it('should create a User Pool Client', () => {
        template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
      });

      it('should export userPoolClient property', () => {
        expect(securityResource.userPoolClient).toBeDefined();
      });
    });

    describe('Secrets Manager', () => {
      it('should create a Secrets Manager secret', () => {
        template.resourceCountIs('AWS::SecretsManager::Secret', 1);
      });

      it('should export secret property', () => {
        expect(securityResource.secret).toBeDefined();
      });

      it('should have correct secret structure', () => {
        template.hasResourceProperties('AWS::SecretsManager::Secret', {
          Description: 'Application secrets',
        });
      });
    });
  });

  describe('SMS Authentication Enabled', () => {
    let securityResource: SecurityResource;
    let template: Template;

    beforeEach(() => {
      securityResource = new SecurityResource(stack, 'TestSecurityWithSms', {
        userPoolName: 'test-pool-sms',
        userPoolClientName: 'test-client-sms',
        secretName: 'test/secrets-sms',
        enableSmsAuth: true,
        smsExternalId: 'TestApp',
      });
      template = Template.fromStack(stack);
    });

    it('should create SMS IAM role for Cognito', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: {
                Service: 'cognito-idp.amazonaws.com',
              },
            }),
          ]),
        },
      });
    });

    it('should have phone sign-in enabled', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AliasAttributes: Match.arrayWith(['phone_number']),
      });
    });

    it('should have phone auto-verify enabled', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AutoVerifiedAttributes: Match.arrayWith(['phone_number']),
      });
    });

    it('should have SMS MFA enabled', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        EnabledMfas: Match.arrayWith(['SMS_MFA']),
      });
    });

    it('should have SmsConfiguration set', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        SmsConfiguration: Match.objectLike({
          ExternalId: 'TestApp',
        }),
      });
    });
  });
});


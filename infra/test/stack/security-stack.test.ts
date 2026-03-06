import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SecurityStack } from '../../lib/stack/security/security-stack';
import { testConfig } from '../test-config';
import { EnvironmentConfig } from '../../config/environment';

describe('SecurityStack', () => {
  let app: cdk.App;

  beforeEach(() => {
    app = new cdk.App();
  });

  describe('Default Configuration (SMS disabled)', () => {
    let stack: SecurityStack;
    let template: Template;

    beforeEach(() => {
      stack = new SecurityStack(
        app,
        'TestSecurityStack',
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

    describe('Cognito User Pool', () => {
      it('should create a Cognito User Pool', () => {
        template.resourceCountIs('AWS::Cognito::UserPool', 1);
      });

      it('should have email as alias attribute', () => {
        template.hasResourceProperties('AWS::Cognito::UserPool', {
          AliasAttributes: Match.arrayWith(['email']),
        });
      });

      it('should have auto-verify email', () => {
        template.hasResourceProperties('AWS::Cognito::UserPool', {
          AutoVerifiedAttributes: ['email'],
        });
      });

      it('should have password policy configured', () => {
        template.hasResourceProperties('AWS::Cognito::UserPool', {
          Policies: {
            PasswordPolicy: Match.objectLike({
              MinimumLength: 8,
              RequireLowercase: true,
              RequireNumbers: true,
              RequireSymbols: true,
              RequireUppercase: true,
            }),
          },
        });
      });

      it('should have MFA configuration', () => {
        template.hasResourceProperties('AWS::Cognito::UserPool', {
          MfaConfiguration: 'OPTIONAL',
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
    });

    describe('Secrets Manager', () => {
      it('should create a Secrets Manager secret', () => {
        template.resourceCountIs('AWS::SecretsManager::Secret', 1);
      });

      it('should have correct secret structure', () => {
        template.hasResourceProperties('AWS::SecretsManager::Secret', {
          Description: 'Application secrets',
        });
      });
    });

    describe('Outputs', () => {
      it('should export User Pool ID', () => {
        const outputs = template.findOutputs('*');
        expect(Object.keys(outputs)).toContain('UserPoolId');
      });

      it('should export User Pool Client ID', () => {
        const outputs = template.findOutputs('*');
        expect(Object.keys(outputs)).toContain('UserPoolClientId');
      });

      it('should export Secret ARN', () => {
        const outputs = template.findOutputs('*');
        expect(Object.keys(outputs)).toContain('SecretArn');
      });
    });

    describe('Stack Properties', () => {
      it('should synthesize successfully', () => {
        expect(() => app.synth()).not.toThrow();
      });
    });
  });

  describe('SMS Authentication Enabled', () => {
    let stack: SecurityStack;
    let template: Template;

    const testConfigWithSms: EnvironmentConfig = {
      ...testConfig,
      cognito: {
        enableSmsAuth: true,
        smsExternalId: 'TestApp',
      },
    };

    beforeEach(() => {
      stack = new SecurityStack(
        app,
        'TestSecurityStackWithSms',
        testConfigWithSms,
        {
          env: {
            account: '123456789012',
            region: 'ap-northeast-1',
          },
        }
      );
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

    it('should have phone as alias attribute', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AliasAttributes: Match.arrayWith(['phone_number']),
      });
    });

    it('should have auto-verify phone', () => {
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

    it('should synthesize successfully', () => {
      expect(() => app.synth()).not.toThrow();
    });
  });
});

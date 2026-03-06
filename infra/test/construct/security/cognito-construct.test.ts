import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CognitoConstruct } from '../../../lib/construct/security/cognito-construct';

describe('CognitoConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  describe('Default Configuration (SMS disabled)', () => {
    let template: Template;

    beforeEach(() => {
      new CognitoConstruct(stack, 'TestCognito', {
        userPoolName: 'test-pool',
      });
      template = Template.fromStack(stack);
    });

    it('should create a Cognito User Pool', () => {
      template.resourceCountIs('AWS::Cognito::UserPool', 1);
    });

    it('should have email sign-in enabled', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AliasAttributes: Match.arrayWith(['email']),
      });
    });

    it('should have email auto-verify enabled', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AutoVerifiedAttributes: ['email'],
      });
    });

    it('should have MFA optional by default', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        MfaConfiguration: 'OPTIONAL',
      });
    });

    it('should have OTP enabled but SMS disabled', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        EnabledMfas: ['SOFTWARE_TOKEN_MFA'],
      });
    });

    it('should not create SMS IAM role when SMS is disabled', () => {
      template.resourceCountIs('AWS::IAM::Role', 0);
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

    it('should have email-only account recovery when SMS is disabled', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Name: 'verified_email',
              Priority: 1,
            },
          ],
        },
      });
    });
  });

  describe('SMS Authentication Enabled', () => {
    let template: Template;
    let cognitoConstruct: CognitoConstruct;

    beforeEach(() => {
      cognitoConstruct = new CognitoConstruct(stack, 'TestCognito', {
        userPoolName: 'test-pool',
        enableSmsAuth: true,
        smsExternalId: 'TestApp',
      });
      template = Template.fromStack(stack);
    });

    it('should create SMS IAM role when SMS is enabled', () => {
      template.resourceCountIs('AWS::IAM::Role', 1);
    });

    it('should export smsRole property', () => {
      expect(cognitoConstruct.smsRole).toBeDefined();
    });

    it('should have SMS role with correct trust policy', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRole',
              Principal: {
                Service: 'cognito-idp.amazonaws.com',
              },
              Condition: {
                StringEquals: {
                  'sts:ExternalId': 'TestApp',
                },
              },
            }),
          ]),
        },
      });
    });

    it('should have SMS role with SNS publish permission', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sns:Publish',
              Effect: 'Allow',
              Resource: '*',
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

    it('should have both SMS and OTP MFA enabled', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        EnabledMfas: Match.arrayWith(['SMS_MFA', 'SOFTWARE_TOKEN_MFA']),
      });
    });

    it('should have email and phone account recovery when SMS is enabled', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AccountRecoverySetting: {
          RecoveryMechanisms: Match.arrayWith([
            Match.objectLike({
              Name: 'verified_email',
            }),
            Match.objectLike({
              Name: 'verified_phone_number',
            }),
          ]),
        },
      });
    });
  });

  describe('User Pool Client', () => {
    let cognitoConstruct: CognitoConstruct;
    let template: Template;

    beforeEach(() => {
      cognitoConstruct = new CognitoConstruct(stack, 'TestCognito', {
        userPoolName: 'test-pool',
      });
      cognitoConstruct.addClient('test-client');
      template = Template.fromStack(stack);
    });

    it('should create a User Pool Client', () => {
      template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    });

    it('should have auth flows configured', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ExplicitAuthFlows: Match.arrayWith([
          'ALLOW_USER_PASSWORD_AUTH',
          'ALLOW_USER_SRP_AUTH',
          'ALLOW_REFRESH_TOKEN_AUTH',
        ]),
      });
    });
  });
});

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../../config/environment';
import { SecurityResource } from '../../resource/security-resource';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface SecurityStackProps extends cdk.StackProps {}

/**
 * レイヤー3: Security Stack（セキュリティスタック）
 * 
 * 責務: 認証・認可・シークレット管理
 * - Cognito User Pool
 * - User Pool Client
 * - Secrets Manager
 * 
 * 含まれるResource: SecurityResource
 * 
 * 変更頻度: 月1回（セキュリティ設定変更）
 * デプロイ時間: 約3-5分
 */
export class SecurityStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly secret: secretsmanager.Secret;

  constructor(
    scope: Construct,
    id: string,
    config: EnvironmentConfig,
    props?: SecurityStackProps
  ) {
    super(scope, id, props);

    // セキュリティリソースの作成（Resource層を使用）
    const securityResource = new SecurityResource(this, 'SecurityResource', {
      userPoolName: `${config.envName}-cdk-template-users`,
      userPoolClientName: `${config.envName}-cdk-template-client`,
      secretName: `${config.envName}/cdk-template/secrets`,
      enableSmsAuth: config.cognito?.enableSmsAuth,
      smsExternalId: config.cognito?.smsExternalId,
    });

    this.userPool = securityResource.userPool;
    this.userPoolClient = securityResource.userPoolClient;
    this.secret = securityResource.secret;

    // タグ付け
    cdk.Tags.of(this).add('Environment', config.envName);
    cdk.Tags.of(this).add('Project', config.tags.Project);
    cdk.Tags.of(this).add('ManagedBy', config.tags.ManagedBy);

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${config.envName}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${config.envName}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'SecretArn', {
      value: this.secret.secretArn,
      description: 'Secrets Manager ARN',
      exportName: `${config.envName}-SecretArn`,
    });
  }
}

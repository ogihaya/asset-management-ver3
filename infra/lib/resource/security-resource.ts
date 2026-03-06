import { Construct } from 'constructs';
import { CognitoConstruct } from '../construct/security/cognito-construct';
import { SecretsManagerConstruct } from '../construct/security/secrets-manager-construct';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface SecurityResourceProps {
  /**
   * Cognito User Pool名
   */
  userPoolName: string;
  /**
   * User Pool Client名
   */
  userPoolClientName: string;
  /**
   * Secrets Manager名
   */
  secretName: string;
  /**
   * SMS認証を有効化
   * @default false
   */
  enableSmsAuth?: boolean;
  /**
   * SMS送信者ID（11文字以内の英数字）
   * @default 'MyApp'
   */
  smsExternalId?: string;
}

/**
 * レイヤー2: セキュリティResource（機能単位）
 * 
 * 責務: セキュリティ機能全体を提供
 * - Cognito User Pool（認証）
 * - User Pool Client（クライアント設定）
 * - Secrets Manager（シークレット管理）
 * 
 * 含まれるConstruct: CognitoConstruct, SecretsManagerConstruct
 * 
 * 変更頻度: 月1回（セキュリティ設定変更）
 */
export class SecurityResource extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly secret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: SecurityResourceProps) {
    super(scope, id);

    // Cognito User Poolの作成
    const cognitoConstruct = new CognitoConstruct(this, 'CognitoConstruct', {
      userPoolName: props.userPoolName,
      enableSmsAuth: props.enableSmsAuth,
      smsExternalId: props.smsExternalId,
    });
    this.userPool = cognitoConstruct.userPool;

    // User Pool Clientの追加
    this.userPoolClient = cognitoConstruct.addClient(props.userPoolClientName);

    // Secrets Managerの作成
    const secretsConstruct = new SecretsManagerConstruct(this, 'SecretsConstruct', {
      secretName: props.secretName,
      description: 'Application secrets',
    });
    this.secret = secretsConstruct.secret;
  }
}


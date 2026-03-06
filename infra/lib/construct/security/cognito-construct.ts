import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface CognitoConstructProps {
  /**
   * User Pool名
   */
  userPoolName: string;
  /**
   * セルフサインアップ有効化
   * @default true
   */
  selfSignUpEnabled?: boolean;
  /**
   * MFA設定
   * @default OPTIONAL
   */
  mfa?: cognito.Mfa;
  /**
   * パスワードポリシー
   */
  passwordPolicy?: cognito.PasswordPolicy;
  /**
   * SMS認証を有効化
   * 有効にすると電話番号でのサインイン・MFA・アカウント回復が可能になる
   * @default false
   */
  enableSmsAuth?: boolean;
  /**
   * SMS送信者ID（11文字以内の英数字）
   * SMSメッセージの送信元として表示される
   * @default 'MyApp'
   */
  smsExternalId?: string;
}

/**
 * レイヤー1: Cognito User PoolConstruct（単一リソース）
 *
 * 責務: 単一のCognito User Poolをセキュアなデフォルト設定で抽象化
 * - MFA対応（OTP / SMS選択可能）
 * - セキュアなパスワードポリシー
 * - SMS認証オプション
 *
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class CognitoConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly smsRole?: iam.Role;

  constructor(scope: Construct, id: string, props: CognitoConstructProps) {
    super(scope, id);

    const enableSms = props.enableSmsAuth ?? false;
    const smsExternalId = props.smsExternalId ?? 'MyApp';

    // SMS認証用IAMロール（SMS有効時のみ作成）
    if (enableSms) {
      this.smsRole = new iam.Role(this, 'SmsRole', {
        roleName: `${props.userPoolName}-sms-role`,
        assumedBy: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
        externalIds: [smsExternalId],
      });

      this.smsRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ['sns:Publish'],
          resources: ['*'],
        })
      );
    }

    // Cognito User Pool（L2コンストラクト）
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: props.userPoolName,
      selfSignUpEnabled: props.selfSignUpEnabled !== false,
      signInAliases: enableSms
        ? {
            email: true,
            username: true,
            phone: true,
          }
        : {
            email: true,
            username: true,
          },
      autoVerify: enableSms
        ? {
            email: true,
            phone: true,
          }
        : {
            email: true,
          },
      mfa: props.mfa || cognito.Mfa.OPTIONAL,
      mfaSecondFactor: enableSms
        ? {
            sms: true,
            otp: true,
          }
        : {
            sms: false,
            otp: true,
          },
      // SMS設定（SMS有効時のみ）
      ...(enableSms && this.smsRole
        ? {
            smsRole: this.smsRole,
            smsRoleExternalId: smsExternalId,
          }
        : {}),
      passwordPolicy: props.passwordPolicy || {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: enableSms
        ? cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA
        : cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY, // 開発環境用
    });
  }

  /**
   * User Pool Clientを追加
   */
  addClient(clientName: string): cognito.UserPoolClient {
    return this.userPool.addClient(clientName, {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });
  }
}


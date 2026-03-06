import { Construct } from 'constructs';
import * as ses from 'aws-cdk-lib/aws-ses';

export interface SesIdentityConstructProps {
  /**
   * 検証するメールアドレスまたはドメイン
   */
  identity: string;
  /**
   * Identityのタイプ（emailまたはdomain）
   * @default 'email'
   */
  identityType?: 'email' | 'domain';
}

/**
 * レイヤー1: SES IdentityConstruct（単一リソース）
 *
 * 責務: 単一のSES Email Identityをセキュアなデフォルト設定で抽象化
 * - メールアドレスまたはドメインの検証
 *
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class SesIdentityConstruct extends Construct {
  public readonly emailIdentity: ses.EmailIdentity;

  constructor(scope: Construct, id: string, props: SesIdentityConstructProps) {
    super(scope, id);

    const identityType = props.identityType ?? 'email';

    // SES Email Identity（L2コンストラクト）
    this.emailIdentity = new ses.EmailIdentity(this, 'EmailIdentity', {
      identity: identityType === 'domain'
        ? ses.Identity.domain(props.identity)
        : ses.Identity.email(props.identity),
    });
  }
}

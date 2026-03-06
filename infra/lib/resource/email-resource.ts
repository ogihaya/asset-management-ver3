import { Construct } from 'constructs';
import { SesIdentityConstruct } from '../construct/messaging/ses-identity-construct';
import { SesTemplateConstruct, EmailTemplateDef } from '../construct/messaging/ses-template-construct';
import * as ses from 'aws-cdk-lib/aws-ses';

export interface EmailResourceProps {
  /**
   * 検証するメールアドレスまたはドメイン
   */
  identityValue: string;
  /**
   * Identityのタイプ（emailまたはdomain）
   * @default 'email'
   */
  identityType?: 'email' | 'domain';
  /**
   * メールテンプレート定義
   * @default []
   */
  templates?: EmailTemplateDef[];
}

/**
 * レイヤー2: メールResource（機能単位）
 *
 * 責務: メール送信機能全体を提供
 * - SES Email Identity（送信元の検証）
 * - SES Email Templates（再利用可能なテンプレート）
 *
 * 含まれるConstruct: SesIdentityConstruct, SesTemplateConstruct
 *
 * 変更頻度: メール設定やテンプレートの変更時
 */
export class EmailResource extends Construct {
  public readonly emailIdentity: ses.EmailIdentity;
  public readonly templates: ses.CfnTemplate[];

  constructor(scope: Construct, id: string, props: EmailResourceProps) {
    super(scope, id);

    // SES Identityの作成
    const identityConstruct = new SesIdentityConstruct(this, 'IdentityConstruct', {
      identity: props.identityValue,
      identityType: props.identityType,
    });
    this.emailIdentity = identityConstruct.emailIdentity;

    // SES Templatesの作成（テンプレートが指定されている場合のみ）
    if (props.templates && props.templates.length > 0) {
      const templateConstruct = new SesTemplateConstruct(this, 'TemplateConstruct', {
        templates: props.templates,
      });
      this.templates = templateConstruct.templates;
    } else {
      this.templates = [];
    }
  }
}

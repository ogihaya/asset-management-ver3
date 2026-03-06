import { Construct } from 'constructs';
import * as ses from 'aws-cdk-lib/aws-ses';

export interface EmailTemplateDef {
  /**
   * テンプレート名
   */
  templateName: string;
  /**
   * メール件名テンプレート
   * SESテンプレート変数（{{variable}}）を使用可能
   */
  subjectPart: string;
  /**
   * HTMLメール本文テンプレート
   * SESテンプレート変数（{{variable}}）を使用可能
   */
  htmlPart?: string;
  /**
   * テキストメール本文テンプレート
   * SESテンプレート変数（{{variable}}）を使用可能
   */
  textPart?: string;
}

export interface SesTemplateConstructProps {
  /**
   * メールテンプレート定義の配列
   */
  templates: EmailTemplateDef[];
}

/**
 * レイヤー1: SES TemplateConstruct（単一リソース）
 *
 * 責務: SESメールテンプレートの作成・管理
 * - 複数テンプレートの一括作成
 * - HTML/テキスト両方のテンプレートをサポート
 *
 * 注意: L2コンストラクトが存在しないためCfnTemplate（L1）を使用
 *
 * 変更頻度: メールテンプレート追加・更新時
 */
export class SesTemplateConstruct extends Construct {
  public readonly templates: ses.CfnTemplate[];

  constructor(scope: Construct, id: string, props: SesTemplateConstructProps) {
    super(scope, id);

    // SES Templates（L1コンストラクト、L2が存在しないため）
    this.templates = props.templates.map((templateDef, index) => {
      return new ses.CfnTemplate(this, `Template${index}`, {
        template: {
          templateName: templateDef.templateName,
          subjectPart: templateDef.subjectPart,
          htmlPart: templateDef.htmlPart,
          textPart: templateDef.textPart,
        },
      });
    });
  }
}

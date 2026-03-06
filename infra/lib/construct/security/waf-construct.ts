import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

/**
 * WAFルールの種類
 */
export enum WafRuleType {
  /** AWS Managed Rules - Common Rule Set (OWASP Top 10対策) */
  COMMON = 'AWSManagedRulesCommonRuleSet',
  /** AWS Managed Rules - Known Bad Inputs */
  KNOWN_BAD_INPUTS = 'AWSManagedRulesKnownBadInputsRuleSet',
  /** AWS Managed Rules - SQL Injection */
  SQLI = 'AWSManagedRulesSQLiRuleSet',
  /** AWS Managed Rules - Linux OS */
  LINUX = 'AWSManagedRulesLinuxRuleSet',
  /** AWS Managed Rules - Amazon IP Reputation */
  IP_REPUTATION = 'AWSManagedRulesAmazonIpReputationList',
  /** AWS Managed Rules - Anonymous IP */
  ANONYMOUS_IP = 'AWSManagedRulesAnonymousIpList',
  /** AWS Managed Rules - Bot Control (有料) */
  BOT_CONTROL = 'AWSManagedRulesBotControlRuleSet',
}

export interface WafConstructProps {
  /**
   * WAF名
   */
  name: string;
  /**
   * WAFスコープ
   * - REGIONAL: ALB, API Gateway用（リージョン単位）
   * - CLOUDFRONT: CloudFront用（us-east-1のみ）
   */
  scope: 'REGIONAL' | 'CLOUDFRONT';
  /**
   * 有効化するAWS Managed Rulesのリスト
   * @default [COMMON, KNOWN_BAD_INPUTS, SQLI, IP_REPUTATION]
   */
  managedRules?: WafRuleType[];
  /**
   * レートリミット（5分間あたりのリクエスト数）
   * @default 2000
   */
  rateLimit?: number;
  /**
   * レートリミットを有効化するか
   * @default true
   */
  enableRateLimit?: boolean;
  /**
   * CloudWatch メトリクスを有効化するか
   * @default true
   */
  enableCloudWatchMetrics?: boolean;
  /**
   * サンプルリクエストを有効化するか
   * @default true
   */
  enableSampledRequests?: boolean;
}

/**
 * レイヤー1: WAF Construct（単一リソース）
 *
 * 責務: AWS WAF WebACLをセキュアなベストプラクティス設定で抽象化
 * - AWS Managed Rules（OWASP Top 10対策）
 * - レートリミット（DDoS対策）
 * - IP Reputation（悪意のあるIPブロック）
 *
 * 変更頻度: ほぼなし（セキュリティポリシー更新時のみ）
 *
 * 使用方法:
 * - ALB用: scope='REGIONAL' で作成し、ALBにアタッチ
 * - CloudFront用: scope='CLOUDFRONT' で作成（us-east-1が必要）
 */
export class WafConstruct extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: WafConstructProps) {
    super(scope, id);

    // デフォルトのManaged Rules
    const managedRules = props.managedRules || [
      WafRuleType.COMMON,
      WafRuleType.KNOWN_BAD_INPUTS,
      WafRuleType.SQLI,
      WafRuleType.IP_REPUTATION,
    ];

    // ルールの構築
    const rules: wafv2.CfnWebACL.RuleProperty[] = [];
    let priority = 1;

    // AWS Managed Rulesを追加
    managedRules.forEach((ruleType) => {
      rules.push({
        name: `AWS-${ruleType}`,
        priority: priority++,
        overrideAction: { none: {} },
        statement: {
          managedRuleGroupStatement: {
            vendorName: 'AWS',
            name: ruleType,
          },
        },
        visibilityConfig: {
          cloudWatchMetricsEnabled: props.enableCloudWatchMetrics ?? true,
          metricName: ruleType.replace('AWSManagedRules', ''),
          sampledRequestsEnabled: props.enableSampledRequests ?? true,
        },
      });
    });

    // レートリミットルールを追加
    if (props.enableRateLimit !== false) {
      rules.push({
        name: 'RateLimitRule',
        priority: 100,
        action: { block: {} },
        statement: {
          rateBasedStatement: {
            limit: props.rateLimit || 2000,
            aggregateKeyType: 'IP',
          },
        },
        visibilityConfig: {
          cloudWatchMetricsEnabled: props.enableCloudWatchMetrics ?? true,
          metricName: 'RateLimit',
          sampledRequestsEnabled: props.enableSampledRequests ?? true,
        },
      });
    }

    // WebACLの作成
    this.webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      name: props.name,
      scope: props.scope,
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: props.enableCloudWatchMetrics ?? true,
        metricName: `${props.name}-metric`,
        sampledRequestsEnabled: props.enableSampledRequests ?? true,
      },
      rules,
    });
  }

  /**
   * WebACL ARNを取得
   */
  get webAclArn(): string {
    return this.webAcl.attrArn;
  }
}

/**
 * WAFとALBの関連付けを作成
 */
export class WafAlbAssociation extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: {
      webAclArn: string;
      albArn: string;
    }
  ) {
    super(scope, id);

    new wafv2.CfnWebACLAssociation(this, 'Association', {
      webAclArn: props.webAclArn,
      resourceArn: props.albArn,
    });
  }
}

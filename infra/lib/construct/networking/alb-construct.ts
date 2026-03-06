import { Construct } from 'constructs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface AlbConstructProps {
  /**
   * ALB名
   */
  loadBalancerName: string;
  /**
   * VPC
   */
  vpc: ec2.IVpc;
  /**
   * インターネット向けか
   * @default true
   */
  internetFacing?: boolean;
  /**
   * サブネット選択
   */
  vpcSubnets?: ec2.SubnetSelection;
  /**
   * アクセスログ用S3バケット
   * 指定するとアクセスログが有効になる
   */
  accessLogBucket?: s3.IBucket;
  /**
   * アクセスログのプレフィックス
   * @default 'alb-logs'
   */
  accessLogPrefix?: string;
}

/**
 * レイヤー1: ALBConstruct（単一リソース）
 * 
 * 責務: 単一のApplication Load Balancerをセキュアなデフォルト設定で抽象化
 * - HTTP/HTTPSリスナーの構成
 * - ヘルスチェック設定
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class AlbConstruct extends Construct {
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: AlbConstructProps) {
    super(scope, id);

    // Application Load Balancer（L2コンストラクト）
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      loadBalancerName: props.loadBalancerName,
      vpc: props.vpc,
      internetFacing: props.internetFacing !== false,
      vpcSubnets: props.vpcSubnets || {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // アクセスログの設定（バケットが指定されている場合）
    if (props.accessLogBucket) {
      this.alb.logAccessLogs(props.accessLogBucket, props.accessLogPrefix ?? 'alb-logs');
    }

    // インターネット向けの場合、HTTP/HTTPSのインバウンドルールを追加
    if (props.internetFacing !== false) {
      this.alb.connections.allowFromAnyIpv4(ec2.Port.tcp(80), 'Allow HTTP from internet');
      this.alb.connections.allowFromAnyIpv4(ec2.Port.tcp(443), 'Allow HTTPS from internet');
    }
  }

  /**
   * HTTPリスナーを追加
   */
  addHttpListener(port: number = 80): elbv2.ApplicationListener {
    return this.alb.addListener('HttpListener', {
      port,
      protocol: elbv2.ApplicationProtocol.HTTP,
      open: true,
    });
  }

  /**
   * HTTPSリスナーを追加
   */
  addHttpsListener(
    port: number = 443,
    certificates?: elbv2.IListenerCertificate[]
  ): elbv2.ApplicationListener {
    return this.alb.addListener('HttpsListener', {
      port,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates,
      open: true,
    });
  }
}


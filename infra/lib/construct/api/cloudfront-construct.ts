import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CloudFrontConstructProps {
  /**
   * オリジンとなるS3バケット
   */
  originBucket: s3.IBucket;
  /**
   * コメント
   */
  comment?: string;
  /**
   * デフォルトルートオブジェクト
   * @default 'index.html'
   */
  defaultRootObject?: string;
  /**
   * エラーレスポンス設定（SPA対応）
   * @default true
   */
  spaMode?: boolean;
  /**
   * WAF WebACL ARN（CloudFront用）
   * 注意: CloudFront用のWAFはus-east-1リージョンに作成する必要があります
   */
  webAclId?: string;
}

/**
 * レイヤー1: CloudFront DistributionConstruct（単一リソース）
 *
 * 責務: 単一のCloudFront Distributionをセキュアなデフォルト設定で抽象化
 * - S3オリジンとの統合（OAC使用）
 * - SPA対応のエラーハンドリング
 *
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class CloudFrontConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly originAccessControl: cloudfront.CfnOriginAccessControl;

  constructor(scope: Construct, id: string, props: CloudFrontConstructProps) {
    super(scope, id);

    // OAC (Origin Access Control) の作成
    this.originAccessControl = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
      originAccessControlConfig: {
        name: `${props.originBucket.bucketName}-oac`,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
        description: `OAC for ${props.originBucket.bucketName}`,
      },
    });

    // CloudFront Distribution（OACを使用）
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(props.originBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: props.defaultRootObject || 'index.html',
      errorResponses: props.spaMode !== false
        ? [
            {
              httpStatus: 403,
              responseHttpStatus: 200,
              responsePagePath: '/index.html',
            },
            {
              httpStatus: 404,
              responseHttpStatus: 200,
              responsePagePath: '/index.html',
            },
          ]
        : undefined,
      comment: props.comment || 'CloudFront Distribution',
      // WAF WebACL（us-east-1で作成されたWAFのARN）
      webAclId: props.webAclId,
    });
  }
}


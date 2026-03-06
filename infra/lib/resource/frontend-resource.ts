import { Construct } from 'constructs';
import { S3Construct } from '../construct/datastore/s3-construct';
import { CloudFrontConstruct } from '../construct/api/cloudfront-construct';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface FrontendResourceProps {
  /**
   * フロントエンドタイプ
   * - 's3-cloudfront': S3 + CloudFront
   */
  type: 's3-cloudfront';
  /**
   * S3バケット名
   */
  bucketName: string;
  /**
   * CloudFrontコメント
   */
  comment?: string;
  /**
   * SPA対応
   * @default true
   */
  spaMode?: boolean;
  /**
   * 削除ポリシー
   * @default DESTROY（開発環境）
   */
  removalPolicy?: RemovalPolicy;
  /**
   * WAF WebACL ARN
   * 注意: CloudFront用のWAFはus-east-1リージョンに作成する必要があります
   * 別スタック（us-east-1）で作成したWAFのARNを指定してください
   */
  webAclId?: string;
}

/**
 * レイヤー2: フロントエンドResource（S3 + CloudFront専用）
 *
 * 責務: S3 + CloudFrontによるフロントエンド配信基盤を提供
 * - S3バケット（OAC経由でCloudFrontからのみアクセス）
 * - CloudFront Distribution（CDN + SPA対応）
 *
 * Note: Amplify Hostingを使用する場合はFrontendStackから直接AmplifyConstructを呼び出します。
 *
 * 含まれるConstruct: S3Construct + CloudFrontConstruct
 *
 * 変更頻度: 日次変更（フロントエンドデプロイ）
 */
export class FrontendResource extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendResourceProps) {
    super(scope, id);

    // S3バケットの作成（OAC使用のためパブリックアクセス不要）
    const s3Construct = new S3Construct(this, 'S3Construct', {
      bucketName: props.bucketName,
      removalPolicy: props.removalPolicy || RemovalPolicy.DESTROY,
      publicReadAccess: false, // OAC経由でCloudFrontからのみアクセス
    });
    this.bucket = s3Construct.bucket;

    // CloudFront Distributionの作成
    const cloudfrontConstruct = new CloudFrontConstruct(this, 'CloudFrontConstruct', {
      originBucket: this.bucket,
      comment: props.comment,
      spaMode: props.spaMode,
      // WAF WebACL（us-east-1で作成されたWAFのARN）
      webAclId: props.webAclId,
    });
    this.distribution = cloudfrontConstruct.distribution;

    console.log(`✅ S3 + CloudFront created: ${props.bucketName}`);
  }
}

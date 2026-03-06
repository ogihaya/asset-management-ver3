import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface S3ConstructProps {
  /**
   * バケット名
   */
  bucketName: string;
  /**
   * バージョニング有効化
   * @default true
   */
  versioned?: boolean;
  /**
   * 削除ポリシー
   * @default RETAIN（本番環境推奨）
   */
  removalPolicy?: RemovalPolicy;
  /**
   * パブリックアクセス設定
   * @default すべてブロック（セキュア）
   */
  publicReadAccess?: boolean;
}

/**
 * レイヤー1: S3バケットConstruct（単一リソース）
 * 
 * 責務: 単一のS3バケットをセキュアなデフォルト設定で抽象化
 * - デフォルトでパブリックアクセス完全ブロック
 * - サーバーサイド暗号化強制
 * - 誤ったパブリック公開を防止
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class S3Construct extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3ConstructProps) {
    super(scope, id);

    // S3 Bucket（L2コンストラクト）
    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      // セキュアなデフォルト設定
      encryption: s3.BucketEncryption.S3_MANAGED, // サーバーサイド暗号化
      blockPublicAccess: props.publicReadAccess
        ? s3.BlockPublicAccess.BLOCK_ACLS
        : s3.BlockPublicAccess.BLOCK_ALL, // パブリックアクセスブロック
      versioned: props.versioned ?? true, // デフォルトでバージョニング有効
      removalPolicy: props.removalPolicy || RemovalPolicy.RETAIN,
      autoDeleteObjects: props.removalPolicy === RemovalPolicy.DESTROY,
      enforceSSL: true, // HTTPS接続を強制
    });
  }
}


import { Construct } from 'constructs';
import { S3Construct } from '../construct/datastore/s3-construct';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface ObjectStorageResourceProps {
  /**
   * S3バケット名
   */
  bucketName: string;
  /**
   * 削除ポリシー
   * @default DESTROY（開発環境）
   */
  removalPolicy?: RemovalPolicy;
  /**
   * バージョニングを有効化
   * @default true
   */
  versioned?: boolean;
  /**
   * 暗号化を有効化
   * @default true
   */
  encrypted?: boolean;
}

/**
 * レイヤー2: オブジェクトストレージResource（機能単位）
 * 
 * 責務: オブジェクトストレージの提供
 * - S3バケット（データバケット、アセット等）
 * 
 * 含まれるConstruct: S3Construct
 * 
 * 変更頻度: まれ（バケット追加時）
 */
export class ObjectStorageResource extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: ObjectStorageResourceProps) {
    super(scope, id);

    // S3バケットの作成
    const s3Construct = new S3Construct(this, 'S3Construct', {
      bucketName: props.bucketName,
      removalPolicy: props.removalPolicy,
      versioned: props.versioned,
    });
    this.bucket = s3Construct.bucket;

    console.log(`✅ S3 bucket created: ${props.bucketName}`);
  }
}


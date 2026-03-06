import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface EcrConstructProps {
  /**
   * リポジトリ名
   */
  repositoryName: string;
  /**
   * イメージスキャン設定（プッシュ時にスキャン）
   * @default true
   */
  imageScanOnPush?: boolean;
  /**
   * イメージタグの変更可能性
   * @default IMMUTABLE（推奨：同じタグでの上書きを防止）
   */
  imageTagMutability?: ecr.TagMutability;
  /**
   * 削除ポリシー
   * @default RETAIN（本番環境推奨）
   */
  removalPolicy?: RemovalPolicy;
  /**
   * 削除時にイメージも削除するか（DESTROY時のみ有効）
   * @default false
   */
  emptyOnDelete?: boolean;
  /**
   * 保持するイメージの最大数（ライフサイクルポリシー）
   * @default 10
   */
  maxImageCount?: number;
  /**
   * 未タグ付きイメージの保持日数
   * @default 1
   */
  untaggedImageRetentionDays?: number;
}

/**
 * レイヤー1: ECR Construct（単一リソース）
 *
 * 責務: ECRリポジトリをセキュアなデフォルト設定で抽象化
 * - イメージスキャン有効化（脆弱性検出）
 * - イミュータブルタグ（同じタグでの上書き防止）
 * - ライフサイクルポリシー（古いイメージの自動削除）
 *
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class EcrConstruct extends Construct {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcrConstructProps) {
    super(scope, id);

    const removalPolicy = props.removalPolicy ?? RemovalPolicy.RETAIN;

    // ECR Repository（L2コンストラクト）
    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName: props.repositoryName,
      // セキュアなデフォルト設定
      imageScanOnPush: props.imageScanOnPush ?? true,
      imageTagMutability:
        props.imageTagMutability ?? ecr.TagMutability.IMMUTABLE,
      removalPolicy,
      emptyOnDelete: removalPolicy === RemovalPolicy.DESTROY
        ? (props.emptyOnDelete ?? true)
        : false,
      // 暗号化（デフォルトでAES256）
      encryption: ecr.RepositoryEncryption.AES_256,
    });

    // ライフサイクルポリシー：古いイメージを自動削除
    const maxImageCount = props.maxImageCount ?? 10;
    const untaggedRetentionDays = props.untaggedImageRetentionDays ?? 1;

    // 未タグ付きイメージ：指定日数後に削除（優先度1: 最高優先）
    this.repository.addLifecycleRule({
      description: `Delete untagged images after ${untaggedRetentionDays} days`,
      maxImageAge: require('aws-cdk-lib').Duration.days(untaggedRetentionDays),
      rulePriority: 1,
      tagStatus: ecr.TagStatus.UNTAGGED,
    });

    // 全イメージ：最新N個を保持（優先度100: ANY は最低優先度にする必要あり）
    this.repository.addLifecycleRule({
      description: `Keep only the last ${maxImageCount} images`,
      maxImageCount,
      rulePriority: 100,
      tagStatus: ecr.TagStatus.ANY,
    });
  }
}

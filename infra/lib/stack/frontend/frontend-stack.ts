import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../../config/environment';
import { AmplifyConstruct } from '../../construct/hosting/amplify-construct';
import { FrontendResource } from '../../resource/frontend-resource';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as amplify from 'aws-cdk-lib/aws-amplify';

export interface FrontendStackProps extends cdk.StackProps {
  /**
   * バックエンドAPI URL（オプション）
   * フロントエンドの環境変数として使用
   */
  backendApiUrl?: string;
  /**
   * バックエンドAPI URLの上書き（オプション）
   * カスタムドメイン等で上書きする場合に使用
   */
  backendApiUrlOverride?: string;
  /**
   * GitHubリポジトリオーナー（Amplify使用時、必須）
   */
  repositoryOwner?: string;
  /**
   * GitHubリポジトリ名（Amplify使用時、必須）
   */
  repositoryName?: string;
  /**
   * メインブランチ名
   * @default 'main'
   */
  mainBranch?: string;
  /**
   * フロントエンドディレクトリ（モノレポ用）
   * @default undefined
   */
  frontendDirectory?: string;
  /**
   * GitHubトークンのSecrets Manager名
   * @default 'github-token'
   */
  githubTokenSecretName?: string;
  /**
   * プルリクエストプレビューを有効化
   * @default false
   */
  enablePullRequestPreview?: boolean;
  /**
   * WAF WebACL ARN（S3+CloudFront使用時のみ）
   */
  webAclId?: string;
}

/**
 * レイヤー3: Frontend Stack（フロントエンドスタック）
 *
 * 責務: フロントエンド配信環境の提供
 *
 * 2つのデプロイ方式をサポート:
 * 1. Amplify（デフォルト）
 *    - Git連携による自動デプロイ
 *    - WEB_COMPUTE platform for Next.js SSR
 *    - ビルドパイプライン内蔵
 *
 * 2. S3 + CloudFront
 *    - カスタマイズ性が高い
 *    - 手動デプロイ
 *    - 細かい制御が可能
 *
 * 変更頻度: 日次変更（フロントエンドデプロイ）
 * デプロイ時間: 約3-5分
 */
export class FrontendStack extends cdk.Stack {
  public readonly bucket?: s3.Bucket;
  public readonly distribution?: cloudfront.Distribution;
  public readonly amplifyApp?: AmplifyConstruct;
  public readonly frontendUrl: string;

  constructor(
    scope: Construct,
    id: string,
    config: EnvironmentConfig,
    props?: FrontendStackProps
  ) {
    super(scope, id, props);

    if (config.frontend.type === 'amplify') {
      // Amplify Hosting: AmplifyConstructを直接呼び出し
      const environmentVariables: { [key: string]: string } = {
        NEXT_PUBLIC_ENV: config.envName,
      };

      const apiUrl = props?.backendApiUrlOverride || props?.backendApiUrl;
      if (apiUrl) {
        environmentVariables['NEXT_PUBLIC_API_URL'] = apiUrl;
      }

      const repositoryOwner = props?.repositoryOwner || config.frontend.repositoryOwner;
      const repositoryName = props?.repositoryName || config.frontend.repositoryName;

      if (!repositoryOwner || !repositoryName) {
        // Amplify app without GitHub connection (placeholder)
        // Set frontendUrl to a placeholder value
        this.frontendUrl = 'https://amplify-placeholder.example.com';

        new cdk.CfnOutput(this, 'FrontendUrl', {
          value: this.frontendUrl,
          description: 'Frontend URL (configure repositoryOwner/repositoryName to enable Amplify)',
          exportName: `${config.envName}-FrontendUrl`,
        });
      } else {
        this.amplifyApp = new AmplifyConstruct(this, 'AmplifyApp', {
          appName: `${config.envName}-frontend`,
          repositoryOwner,
          repositoryName,
          githubTokenSecretName: props?.githubTokenSecretName || config.frontend.githubTokenSecretName,
          mainBranch: props?.mainBranch || config.frontend.mainBranch || 'main',
          frontendDirectory: props?.frontendDirectory || config.frontend.frontendDirectory,
          environmentVariables,
          enablePullRequestPreview: props?.enablePullRequestPreview || config.frontend.enablePullRequestPreview,
        });

        this.frontendUrl = `https://${this.amplifyApp.defaultDomain}`;

        new cdk.CfnOutput(this, 'FrontendUrl', {
          value: this.frontendUrl,
          description: 'Frontend Amplify URL',
          exportName: `${config.envName}-FrontendUrl`,
        });
      }
    } else {
      // S3 + CloudFront を使用（FrontendResource経由）
      const bucketPrefix = `${config.envName}-cdk-template-frontend`;

      const frontendResource = new FrontendResource(this, 'FrontendResource', {
        type: 's3-cloudfront',
        bucketName: bucketPrefix,
        comment: `${config.envName} CDK Template Frontend`,
        spaMode: true,
        removalPolicy: config.removalPolicy,
        webAclId: props?.webAclId,
      });

      this.bucket = frontendResource.bucket;
      this.distribution = frontendResource.distribution;

      if (this.distribution) {
        this.frontendUrl = `https://${this.distribution.distributionDomainName}`;

        new cdk.CfnOutput(this, 'FrontendUrl', {
          value: this.frontendUrl,
          description: 'Frontend CloudFront URL',
          exportName: `${config.envName}-FrontendUrl`,
        });

        new cdk.CfnOutput(this, 'DistributionId', {
          value: this.distribution.distributionId,
          description: 'CloudFront Distribution ID',
          exportName: `${config.envName}-DistributionId`,
        });
      } else {
        this.frontendUrl = '';
      }

      if (this.bucket) {
        new cdk.CfnOutput(this, 'FrontendBucketName', {
          value: this.bucket.bucketName,
          description: 'Frontend S3 Bucket Name',
          exportName: `${config.envName}-FrontendBucketName`,
        });
      }
    }

    // バックエンドAPI URL（共通）
    if (props?.backendApiUrl) {
      new cdk.CfnOutput(this, 'BackendApiUrl', {
        value: props.backendApiUrl,
        description: 'Backend API URL for Frontend',
      });
    }

    // タグ付け
    cdk.Tags.of(this).add('Environment', config.envName);
    cdk.Tags.of(this).add('Project', config.tags.Project);
    cdk.Tags.of(this).add('ManagedBy', config.tags.ManagedBy);
    cdk.Tags.of(this).add('Layer', 'Frontend');
    cdk.Tags.of(this).add('FrontendType', config.frontend.type);
  }
}

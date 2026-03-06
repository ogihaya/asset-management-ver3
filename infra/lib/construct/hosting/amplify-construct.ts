import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as cdk from 'aws-cdk-lib';
import { SecretValue } from 'aws-cdk-lib';

export interface AmplifyConstructProps {
  /**
   * Amplify app name
   */
  appName: string;
  /**
   * GitHub repository owner (organization or user)
   */
  repositoryOwner: string;
  /**
   * GitHub repository name
   */
  repositoryName: string;
  /**
   * Secrets Manager secret name for GitHub access token
   * @default 'github-token'
   */
  githubTokenSecretName?: string;
  /**
   * Main branch name
   * @default 'main'
   */
  mainBranch?: string;
  /**
   * Frontend directory in monorepo
   * e.g. 'frontend' or 'apps/web'
   * @default undefined (repository root)
   */
  frontendDirectory?: string;
  /**
   * Environment variables
   */
  environmentVariables?: { [key: string]: string };
  /**
   * Enable pull request preview
   * @default false
   */
  enablePullRequestPreview?: boolean;
}

/**
 * Layer 1: Amplify Hosting Construct
 *
 * Responsibilities: Create AWS Amplify Hosting app with WEB_COMPUTE platform for Next.js SSR
 * - Git-based auto deploy
 * - Build/deploy pipeline
 * - Custom domain support
 *
 * Usage:
 * ```typescript
 * const amplify = new AmplifyConstruct(this, 'Amplify', {
 *   appName: 'my-app',
 *   repositoryOwner: 'my-org',
 *   repositoryName: 'my-repo',
 * });
 * ```
 */
export class AmplifyConstruct extends Construct {
  public readonly app: amplify.CfnApp;
  public readonly branch: amplify.CfnBranch;
  public readonly defaultDomain: string;

  constructor(scope: Construct, id: string, props: AmplifyConstructProps) {
    super(scope, id);

    const branchName = props.mainBranch || 'main';

    // Amplify app creation (WEB_COMPUTE for Next.js SSR)
    this.app = new amplify.CfnApp(this, 'App', {
      name: props.appName,
      repository: `https://github.com/${props.repositoryOwner}/${props.repositoryName}`,
      accessToken: SecretValue.secretsManager(
        props.githubTokenSecretName || 'github-token'
      ).unsafeUnwrap(),
      platform: 'WEB_COMPUTE',
      environmentVariables: props.environmentVariables
        ? Object.entries(props.environmentVariables).map(([name, value]) => ({
            name,
            value,
          }))
        : undefined,
    });

    // Branch creation
    this.branch = new amplify.CfnBranch(this, 'Branch', {
      appId: this.app.attrAppId,
      branchName,
      stage: 'PRODUCTION',
      enableAutoBuild: true,
      enablePullRequestPreview: props.enablePullRequestPreview || false,
    });

    this.defaultDomain = this.app.attrDefaultDomain;

    // Outputs
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: this.app.attrAppId,
      description: 'Amplify App ID',
    });

    new cdk.CfnOutput(this, 'AmplifyDefaultDomain', {
      value: this.defaultDomain,
      description: 'Amplify Default Domain',
    });

    new cdk.CfnOutput(this, 'AmplifyBranchUrl', {
      value: `https://${branchName}.${this.defaultDomain}`,
      description: 'Amplify Branch URL',
    });
  }
}

import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

export interface LambdaConstructProps {
  /**
   * 関数名
   */
  functionName: string;
  /**
   * ランタイム
   * @default NODEJS_20_X
   */
  runtime?: lambda.Runtime;
  /**
   * ハンドラー
   * @default 'index.handler'
   */
  handler?: string;
  /**
   * コードのパス
   * @default 'lambda'
   */
  codePath?: string;
  /**
   * メモリサイズ（MB）
   * @default 256
   */
  memorySize?: number;
  /**
   * タイムアウト（秒）
   * @default 30
   */
  timeout?: number;
  /**
   * 環境変数
   */
  environment?: { [key: string]: string };
  /**
   * VPC（オプション）
   */
  vpc?: ec2.IVpc;
  /**
   * VPCサブネット選択（VPC指定時のみ）
   */
  vpcSubnets?: ec2.SubnetSelection;
  /**
   * ログ保持期間（日）
   * @default 7
   */
  logRetentionDays?: number;
}

/**
 * レイヤー1: Lambda関数Construct（単一リソース）
 * 
 * 責務: 単一のLambda関数をセキュアなデフォルト設定で抽象化
 * - CloudWatch Logsの自動設定
 * - VPC配置のオプション対応
 * - セキュアなデフォルト設定
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class LambdaConstruct extends Construct {
  public readonly function: lambda.Function;
  public readonly logGroup: logs.LogGroup;
  public readonly securityGroup?: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    // CloudWatch LogGroup（自動削除設定）
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${props.functionName}`,
      retention: props.logRetentionDays || logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // VPC配置時はセキュリティグループを作成
    if (props.vpc) {
      this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
        vpc: props.vpc,
        description: `Security group for Lambda ${props.functionName}`,
        allowAllOutbound: true,
      });
    }

    // Lambda Function（L2コンストラクト）
    this.function = new lambda.Function(this, 'Function', {
      functionName: props.functionName,
      runtime: props.runtime || lambda.Runtime.NODEJS_20_X,
      handler: props.handler || 'index.handler',
      code: lambda.Code.fromAsset(props.codePath || 'lambda'),
      memorySize: props.memorySize || 256,
      timeout: Duration.seconds(props.timeout || 30),
      environment: props.environment || {},
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: this.securityGroup ? [this.securityGroup] : undefined,
      logGroup: this.logGroup,
      // セキュアなデフォルト設定
      reservedConcurrentExecutions: undefined, // 必要に応じて制限
      retryAttempts: 2, // デフォルトのリトライ設定
    });
  }

  /**
   * 環境変数を追加
   */
  addEnvironment(key: string, value: string): void {
    this.function.addEnvironment(key, value);
  }

  /**
   * IAMポリシーを追加
   */
  grantInvoke(grantee: any): void {
    this.function.grantInvoke(grantee);
  }
}


import { Construct } from 'constructs';
import { LambdaConstruct } from '../construct/compute/lambda-construct';
import { ApiGatewayConstruct } from '../construct/api/api-gateway-construct';
import {
  EcsConstruct,
  FargateTaskDefinitionConstruct,
  FargateServiceConstruct,
} from '../construct/compute/ecs-construct';
import { AlbConstruct } from '../construct/networking/alb-construct';
import { SecurityGroupConstruct } from '../construct/networking/security-group-construct';
import {
  WafConstruct,
  WafAlbAssociation,
  WafRuleType,
} from '../construct/security/waf-construct';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { WafConfig } from '../../config/environment';

export interface ApiResourceProps {
  /**
   * Lambda関数名
   */
  lambdaFunctionName: string;
  /**
   * API Gateway名
   */
  apiGatewayName: string;
  /**
   * ECSクラスター名
   */
  ecsClusterName: string;
  /**
   * ECSサービス名
   */
  ecsServiceName: string;
  /**
   * ALB名
   */
  albName: string;
  /**
   * VPC
   */
  vpc: ec2.IVpc;
  /**
   * コンテナイメージ（ECS用）
   */
  containerImage?: ecs.ContainerImage;
  /**
   * Lambda設定（undefinedの場合、Lambdaは作成されません）
   */
  lambdaConfig?: {
    memorySize?: number;
    timeout?: number;
    reservedConcurrency?: number;
  };
  /**
   * WAF設定（本番環境推奨）
   * ALBにWAFを適用してOWASP Top 10対策を実施
   */
  wafConfig?: WafConfig;
  /**
   * ALBアクセスログ用S3バケット
   * 指定するとALBアクセスログが有効になる
   */
  albLogBucket?: s3.IBucket;
  /**
   * ALBアクセスログのプレフィックス
   * @default 'alb-logs'
   */
  albLogPrefix?: string;
  /**
   * データベース認証情報（Secrets Manager）
   * ECSタスクの環境変数として注入される
   */
  databaseSecret?: secretsmanager.ISecret;
}

/**
 * レイヤー2: APIResource（機能単位）
 * 
 * 責務: API基盤全体を提供
 * - Lambda関数（軽量API）※オプショナル
 * - API Gateway（Lambda統合）※Lambda有効時のみ
 * - ECSクラスター（長時間実行API）
 * - Application Load Balancer（ECS統合）
 * 
 * 含まれるConstruct: LambdaConstruct, ApiGatewayConstruct, EcsConstruct, AlbConstruct
 * 
 * 変更頻度: 週1-2回（API機能追加・修正）
 */
export class ApiResource extends Construct {
  public readonly lambdaFunction?: lambda.Function;
  public readonly lambdaSecurityGroup?: ec2.ISecurityGroup;
  public readonly apiGateway?: apigateway.RestApi;
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecsService: ecs.FargateService;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly ecsSecurityGroup: ec2.ISecurityGroup;
  public readonly albSecurityGroup: ec2.ISecurityGroup;
  public readonly webAcl?: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: ApiResourceProps) {
    super(scope, id);

    // Lambda関数の作成（設定がある場合のみ）
    if (props.lambdaConfig) {
    const lambdaConstruct = new LambdaConstruct(this, 'LambdaConstruct', {
      functionName: props.lambdaFunctionName,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
        memorySize: props.lambdaConfig.memorySize,
        timeout: props.lambdaConfig.timeout,
        // Note: reservedConcurrentExecutions はLambdaConstructPropsに未定義のため省略
    });
    this.lambdaFunction = lambdaConstruct.function;
    this.lambdaSecurityGroup = lambdaConstruct.securityGroup;

      // API Gatewayの作成（Lambda有効時のみ）
    const apiGatewayConstruct = new ApiGatewayConstruct(this, 'ApiGatewayConstruct', {
      restApiName: props.apiGatewayName,
    });
    this.apiGateway = apiGatewayConstruct.api;

    // Lambda統合
    apiGatewayConstruct.addLambdaIntegration('/hello', 'GET', this.lambdaFunction);
    }

    // ECSクラスターの作成
    const ecsConstruct = new EcsConstruct(this, 'EcsConstruct', {
      clusterName: props.ecsClusterName,
      vpc: props.vpc,
    });
    this.ecsCluster = ecsConstruct.cluster;

    // ECSタスク定義
    const taskDefConstruct = new FargateTaskDefinitionConstruct(
      this,
      'TaskDefConstruct',
      {
        family: `${props.ecsServiceName}-task`,
        cpu: 256,
        memoryLimitMiB: 512,
      }
    );

    // コンテナ定義
    const logGroup = new logs.LogGroup(this, 'EcsLogGroup', {
      logGroupName: `/ecs/${props.ecsServiceName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // コンテナ追加
    // 環境変数の管理方針:
    // - 非機密情報: S3の.envファイル（environmentFiles）を使用
    // - 機密情報: Secrets Manager（secrets）を使用
    //
    // データベース認証情報の注入:
    // Secrets Managerに保存されたDB認証情報を環境変数として注入
    // シークレットJSON形式: {"username":"...","password":"...","host":"...","port":5432,"dbname":"..."}
    // 各フィールドを個別の環境変数として展開
    const secrets: Record<string, ecs.Secret> = {};
    if (props.databaseSecret) {
      secrets['DB_HOST'] = ecs.Secret.fromSecretsManager(props.databaseSecret, 'host');
      secrets['DB_PORT'] = ecs.Secret.fromSecretsManager(props.databaseSecret, 'port');
      secrets['DB_NAME'] = ecs.Secret.fromSecretsManager(props.databaseSecret, 'dbname');
      secrets['DB_USER'] = ecs.Secret.fromSecretsManager(props.databaseSecret, 'username');
      secrets['DB_PASSWORD'] = ecs.Secret.fromSecretsManager(props.databaseSecret, 'password');
    }

    // コンテナイメージの決定
    // containerImage指定時はそれを使用、未指定時はnginx:latest（プレースホルダー）
    const containerImage = props.containerImage || ecs.ContainerImage.fromRegistry('nginx:latest');

    taskDefConstruct.addContainer('app', {
      image: containerImage,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'ecs',
        logGroup,
      }),
      portMappings: [
        {
          containerPort: 8000, // FastAPI のデフォルトポート
          protocol: ecs.Protocol.TCP,
        },
      ],
      // データベース認証情報をSecrets Managerから注入
      secrets: Object.keys(secrets).length > 0 ? secrets : undefined,
    });

    // セキュリティグループ（ECS）
    const ecsSecurityGroupConstruct = new SecurityGroupConstruct(
      this,
      'EcsSecurityGroup',
      {
        securityGroupName: `${props.ecsServiceName}-sg`,
        vpc: props.vpc,
        description: `Security group for ${props.ecsServiceName}`,
      }
    );
    this.ecsSecurityGroup = ecsSecurityGroupConstruct.securityGroup;

    // Fargateサービス
    const serviceConstruct = new FargateServiceConstruct(this, 'ServiceConstruct', {
      serviceName: props.ecsServiceName,
      cluster: this.ecsCluster,
      taskDefinition: taskDefConstruct.taskDefinition,
      securityGroups: [this.ecsSecurityGroup],
    });
    this.ecsService = serviceConstruct.service;

    // ALBの作成
    const albConstruct = new AlbConstruct(this, 'AlbConstruct', {
      loadBalancerName: props.albName,
      vpc: props.vpc,
      accessLogBucket: props.albLogBucket,
      accessLogPrefix: props.albLogPrefix,
    });
    this.alb = albConstruct.alb;
    this.albSecurityGroup = this.alb.connections.securityGroups[0];

    // HTTPリスナー追加
    const listener = albConstruct.addHttpListener(80);

    // ターゲットグループ追加
    listener.addTargets('EcsTarget', {
      port: 8000, // FastAPI のデフォルトポート
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.ecsService],
      healthCheck: {
        path: '/health', // FastAPI ヘルスチェックエンドポイント
        interval: Duration.seconds(60),
      },
    });

    // セキュリティグループルール
    this.ecsSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(8000),
      'Allow traffic from ALB'
    );

    // WAFの作成とALBへの紐付け（設定が有効な場合のみ）
    if (props.wafConfig?.enabled) {
      // Managed Rulesの設定
      const managedRules: WafRuleType[] = [
        WafRuleType.COMMON, // OWASP Top 10対策
        WafRuleType.KNOWN_BAD_INPUTS, // 既知の悪意あるパターン
        WafRuleType.SQLI, // SQLインジェクション対策
        WafRuleType.IP_REPUTATION, // 悪意のあるIPブロック
      ];

      // Bot Control（追加コストが発生するため、オプション）
      if (props.wafConfig.enableBotControl) {
        managedRules.push(WafRuleType.BOT_CONTROL);
      }

      const wafConstruct = new WafConstruct(this, 'AlbWaf', {
        name: `${props.albName}-waf`,
        scope: 'REGIONAL',
        managedRules,
        rateLimit: props.wafConfig.rateLimit || 2000,
        enableRateLimit: true,
      });
      this.webAcl = wafConstruct.webAcl;

      // WAFとALBの関連付け
      new WafAlbAssociation(this, 'WafAlbAssociation', {
        webAclArn: wafConstruct.webAclArn,
        albArn: this.alb.loadBalancerArn,
      });
    }
  }
}


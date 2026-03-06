import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../../config/environment';
import { ApiResource } from '../../resource/api-resource';
import { EcrConstruct } from '../../construct/compute/ecr-construct';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface BackendStackProps extends cdk.StackProps {
  /**
   * VPC（FoundationStackから渡される）
   */
  vpc: ec2.IVpc;
  /**
   * データベースセキュリティグループ（DataStorageStackから渡される）
   * BackendStack側でingressルールを追加することで循環参照を回避
   */
  databaseSecurityGroup?: ec2.ISecurityGroup;
  /**
   * データベースポート（デフォルト: 5432）
   */
  databasePort?: number;
  /**
   * データベース認証情報（Secrets Manager）
   * ECSタスクの環境変数として注入される
   */
  databaseSecret?: secretsmanager.ISecret;
}

/**
 * レイヤー3: Backend Stack（バックエンドスタック）
 * 
 * 責務: バックエンドAPI実行環境の提供
 * - Lambda関数（軽量API）※オプショナル
 * - API Gateway（Lambda統合）※Lambda有効時のみ
 * - ECSクラスター（コンテナAPI）
 * - Application Load Balancer（ECS統合）
 * 
 * 含まれるResource: ApiResource
 * 
 * 変更頻度: 週1-2回（API機能追加・修正）
 * デプロイ時間: 約5-7分
 * 
 * 分離理由:
 * - フロントエンドとバックエンドの独立デプロイを実現
 * - バックエンドチームが独立して作業可能
 * - API変更時にフロントエンドへの影響を最小化
 */
export class BackendStack extends cdk.Stack {
  public readonly lambdaFunction?: lambda.Function;
  public readonly lambdaSecurityGroup?: ec2.ISecurityGroup;
  public readonly apiGateway?: apigateway.RestApi;
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecsService: ecs.FargateService;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly ecsSecurityGroup: ec2.ISecurityGroup;
  public readonly webAcl?: wafv2.CfnWebACL;
  public readonly ecrRepository: ecr.IRepository;

  constructor(
    scope: Construct,
    id: string,
    config: EnvironmentConfig,
    props: BackendStackProps
  ) {
    super(scope, id, props);

    // ECRリポジトリの作成
    // latestタグを使用するためMUTABLEに設定
    // セキュリティはライフサイクルポリシーとイメージスキャンで担保
    const ecrConstruct = new EcrConstruct(this, 'BackendEcr', {
      repositoryName: `${config.envName}-cdk-template-backend`,
      removalPolicy: config.removalPolicy,
      maxImageCount: config.envName === 'prod' ? 20 : 10,
      imageTagMutability: ecr.TagMutability.MUTABLE,
    });
    this.ecrRepository = ecrConstruct.repository;

    // APIリソースの作成（Resource層を使用）
    const apiResource = new ApiResource(this, 'ApiResource', {
      lambdaFunctionName: `${config.envName}-cdk-template-api`,
      apiGatewayName: `${config.envName}-cdk-template-api`,
      ecsClusterName: `${config.envName}-cdk-template-cluster`,
      ecsServiceName: `${config.envName}-cdk-template-backend`,
      albName: `${config.envName}-cdk-template-alb`,
      vpc: props.vpc,
      lambdaConfig: config.lambda, // Lambda設定を渡す（undefinedの場合は作成されない）
      wafConfig: config.waf, // WAF設定を渡す（undefinedの場合は作成されない）
      databaseSecret: props.databaseSecret, // DB認証情報をECSに注入
      containerImage: ecs.ContainerImage.fromEcrRepository(ecrConstruct.repository, 'latest'), // ECRからイメージを取得
    });

    this.lambdaFunction = apiResource.lambdaFunction;
    this.lambdaSecurityGroup = apiResource.lambdaSecurityGroup;
    this.apiGateway = apiResource.apiGateway;
    this.ecsCluster = apiResource.ecsCluster;
    this.ecsService = apiResource.ecsService;
    this.alb = apiResource.alb;
    this.ecsSecurityGroup = apiResource.ecsSecurityGroup;
    this.webAcl = apiResource.webAcl;

    // データベースへのアクセス許可（循環参照を回避するためBackendStack側で設定）
    if (props.databaseSecurityGroup) {
      const dbPort = props.databasePort ?? 5432;

      // ECSからDBへのアクセス許可
      new ec2.CfnSecurityGroupIngress(this, 'EcsToDbIngress', {
        ipProtocol: 'tcp',
        fromPort: dbPort,
        toPort: dbPort,
        groupId: props.databaseSecurityGroup.securityGroupId,
        sourceSecurityGroupId: this.ecsSecurityGroup.securityGroupId,
        description: 'Allow ECS to access database',
      });

      // LambdaからDBへのアクセス許可（Lambda有効時のみ）
      if (this.lambdaSecurityGroup) {
        new ec2.CfnSecurityGroupIngress(this, 'LambdaToDbIngress', {
          ipProtocol: 'tcp',
          fromPort: dbPort,
          toPort: dbPort,
          groupId: props.databaseSecurityGroup.securityGroupId,
          sourceSecurityGroupId: this.lambdaSecurityGroup.securityGroupId,
          description: 'Allow Lambda to access database',
        });
      }
    }

    // タグ付け
    cdk.Tags.of(this).add('Environment', config.envName);
    cdk.Tags.of(this).add('Project', config.tags.Project);
    cdk.Tags.of(this).add('ManagedBy', config.tags.ManagedBy);
    cdk.Tags.of(this).add('Layer', 'Backend');

    // Outputs（Lambda有効時のみ）
    if (this.apiGateway) {
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.apiGateway.url,
      description: 'API Gateway URL',
      exportName: `${config.envName}-ApiGatewayUrl`,
    });
    }

    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: this.alb.loadBalancerDnsName,
      description: 'ALB DNS Name',
      exportName: `${config.envName}-AlbDnsName`,
    });

    if (this.lambdaFunction) {
    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: this.lambdaFunction.functionName,
      description: 'Lambda Function Name',
      exportName: `${config.envName}-LambdaFunctionName`,
    });
    }

    new cdk.CfnOutput(this, 'EcsClusterName', {
      value: this.ecsCluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: `${config.envName}-EcsClusterName`,
    });

    new cdk.CfnOutput(this, 'EcsServiceName', {
      value: this.ecsService.serviceName,
      description: 'ECS Service Name',
      exportName: `${config.envName}-EcsServiceName`,
    });

    new cdk.CfnOutput(this, 'BackendEcrRepositoryUri', {
      value: this.ecrRepository.repositoryUri,
      description: 'Backend ECR Repository URI',
      exportName: `${config.envName}-BackendEcrRepositoryUri`,
    });

    new cdk.CfnOutput(this, 'BackendEcrRepositoryArn', {
      value: this.ecrRepository.repositoryArn,
      description: 'Backend ECR Repository ARN',
      exportName: `${config.envName}-BackendEcrRepositoryArn`,
    });
  }
}


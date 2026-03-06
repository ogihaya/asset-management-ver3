import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface ApiGatewayConstructProps {
  /**
   * API名
   */
  restApiName: string;
  /**
   * 説明
   */
  description?: string;
  /**
   * デフォルトCORSプリフライトオプション
   */
  defaultCorsPreflightOptions?: apigateway.CorsOptions;
}

/**
 * レイヤー1: API GatewayConstruct（単一リソース）
 * 
 * 責務: 単一のAPI Gatewayをセキュアなデフォルト設定で抽象化
 * - REST API構成
 * - CORS設定
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class ApiGatewayConstruct extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    // API Gateway REST API（L2コンストラクト）
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: props.restApiName,
      description: props.description || `API Gateway for ${props.restApiName}`,
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
      defaultCorsPreflightOptions: props.defaultCorsPreflightOptions || {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });
  }

  /**
   * Lambda統合を追加
   */
  addLambdaIntegration(
    path: string,
    method: string,
    lambdaFunction: lambda.IFunction
  ): apigateway.Method {
    const resource = this.api.root.resourceForPath(path);
    return resource.addMethod(
      method,
      new apigateway.LambdaIntegration(lambdaFunction)
    );
  }
}


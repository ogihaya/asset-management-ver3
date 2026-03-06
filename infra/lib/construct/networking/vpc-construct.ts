import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface VpcConstructProps {
  /**
   * VPC名
   */
  vpcName: string;
  /**
   * VPCのCIDR
   * @default '10.0.0.0/16'
   */
  cidr?: string;
  /**
   * Availability Zoneの数
   * @default 2
   */
  maxAzs?: number;
  /**
   * NATゲートウェイの数
   * @default 1
   */
  natGateways?: number;
  /**
   * DNSサポート
   * @default true
   */
  enableDnsSupport?: boolean;
  /**
   * DNSホスト名
   * @default true
   */
  enableDnsHostnames?: boolean;
}

/**
 * レイヤー1: VPCConstruct（単一リソース）
 * 
 * 責務: 単一のVPCをセキュアなデフォルト設定で抽象化
 * - パブリック/プライベートサブネットの自動構成
 * - マルチAZ対応
 * - DNSサポート有効化
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class VpcConstruct extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcConstructProps) {
    super(scope, id);

    // VPC（L2コンストラクト）
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: props.vpcName,
      ipAddresses: ec2.IpAddresses.cidr(props.cidr || '10.0.0.0/16'),
      maxAzs: props.maxAzs || 2,
      natGateways: props.natGateways !== undefined ? props.natGateways : 1,
      subnetConfiguration: [
        {
          cidrMask: 20,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 20,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      enableDnsHostnames: props.enableDnsHostnames !== false,
      enableDnsSupport: props.enableDnsSupport !== false,
      // Gateway Endpoints（無料）- NAT Gatewayを経由せずAWSサービスにアクセス
      gatewayEndpoints: {
        S3: {
          service: ec2.GatewayVpcEndpointAwsService.S3,
        },
        DynamoDB: {
          service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
        },
      },
    });

    // Interface Endpoints（有料）- プライベートサブネットからAWSサービスにアクセス
    // ECR用（Docker Pull）
    this.vpc.addInterfaceEndpoint('EcrApiEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
    });
    this.vpc.addInterfaceEndpoint('EcrDkrEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
    });

    // CloudWatch Logs用
    this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    });

    // Secrets Manager用
    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });
  }

  /**
   * パブリックサブネットを取得
   */
  get publicSubnets(): ec2.ISubnet[] {
    return this.vpc.publicSubnets;
  }

  /**
   * プライベートサブネットを取得
   */
  get privateSubnets(): ec2.ISubnet[] {
    return this.vpc.privateSubnets;
  }
}


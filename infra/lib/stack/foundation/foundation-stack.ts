import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../../config/environment';
import { NetworkResource } from '../../resource/network-resource';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface FoundationStackProps extends cdk.StackProps {}

/**
 * レイヤー3: Foundation Stack（基盤スタック）
 * 
 * 責務: ネットワーク基盤の提供
 * - VPC
 * - サブネット
 * - ゲートウェイ
 * 
 * 含まれるResource: NetworkResource
 * 
 * 変更頻度: 年1回以下（ネットワーク構成は滅多に変更しない）
 * デプロイ時間: 約3-5分
 */
export class FoundationStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;

  constructor(
    scope: Construct,
    id: string,
    config: EnvironmentConfig,
    props?: FoundationStackProps
  ) {
    super(scope, id, props);

    // ネットワーク基盤の作成（Resource層を使用）
    const networkResource = new NetworkResource(this, 'NetworkResource', {
      vpcName: `${config.envName}-cdk-template-vpc`,
      cidr: '10.0.0.0/16',
      maxAzs: config.network.maxAzs,
      natGateways: config.network.natGateways,
    });

    this.vpc = networkResource.vpc;

    // タグ付け
    cdk.Tags.of(this).add('Environment', config.envName);
    cdk.Tags.of(this).add('Project', config.tags.Project);
    cdk.Tags.of(this).add('ManagedBy', config.tags.ManagedBy);

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${config.envName}-VpcId`,
    });
  }
}

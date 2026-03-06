import { Construct } from 'constructs';
import { VpcConstruct } from '../construct/networking/vpc-construct';
import { IsolationSecurityGroupConstruct } from '../construct/networking/isolation-security-group-construct';
import { IsolationNaclConstruct } from '../construct/networking/isolation-nacl-construct';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface NetworkResourceProps {
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
   * 緊急隔離用のセキュリティグループとNACLを作成するか
   * インシデント発生時にリソースをネットワークから即座に隔離するために使用
   * @default true
   */
  createIsolationResources?: boolean;
}

/**
 * レイヤー2: ネットワークResource（機能単位）
 *
 * 責務: ネットワーク基盤全体を提供
 * - VPC
 * - サブネット（パブリック/プライベート）
 * - インターネットゲートウェイ
 * - NATゲートウェイ
 * - ルートテーブル
 * - 緊急隔離用リソース（SG/NACL）
 *
 * 含まれるConstruct: VpcConstruct, IsolationSecurityGroupConstruct, IsolationNaclConstruct
 *
 * 変更頻度: まれ（テンプレートの改善時）
 */
export class NetworkResource extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly privateSubnets: ec2.ISubnet[];
  /**
   * 緊急隔離用セキュリティグループ
   * インシデント発生時にリソースのSGをこれに付け替えることで即座に隔離可能
   */
  public readonly isolationSecurityGroup?: ec2.SecurityGroup;
  /**
   * 緊急隔離用NACL
   * インシデント発生時にサブネットのNACLをこれに付け替えることで即座に隔離可能
   * （SGより強力: ステートレスなので既存コネクションも即座に遮断）
   */
  public readonly isolationNacl?: ec2.NetworkAcl;

  constructor(scope: Construct, id: string, props: NetworkResourceProps) {
    super(scope, id);

    // VPCの作成（Construct層を使用）
    const vpcConstruct = new VpcConstruct(this, 'VpcConstruct', {
      vpcName: props.vpcName,
      cidr: props.cidr,
      maxAzs: props.maxAzs,
      natGateways: props.natGateways,
    });

    this.vpc = vpcConstruct.vpc;
    this.publicSubnets = vpcConstruct.publicSubnets;
    this.privateSubnets = vpcConstruct.privateSubnets;

    // 緊急隔離用リソースの作成（デフォルトで有効）
    if (props.createIsolationResources !== false) {
      // 隔離用セキュリティグループ
      const isolationSg = new IsolationSecurityGroupConstruct(
        this,
        'IsolationSG',
        {
          vpc: this.vpc,
          namePrefix: props.vpcName,
        }
      );
      this.isolationSecurityGroup = isolationSg.securityGroup;

      // 隔離用NACL
      const isolationNacl = new IsolationNaclConstruct(this, 'IsolationNACL', {
        vpc: this.vpc,
        namePrefix: props.vpcName,
      });
      this.isolationNacl = isolationNacl.nacl;
    }
  }
}


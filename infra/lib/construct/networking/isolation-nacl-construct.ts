import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Tags } from 'aws-cdk-lib';

export interface IsolationNaclConstructProps {
  /**
   * VPC
   */
  vpc: ec2.IVpc;
  /**
   * 隔離用NACLの名前プレフィックス
   * @default 'isolation'
   */
  namePrefix?: string;
}

/**
 * レイヤー1: IsolationNaclConstruct（緊急隔離用ネットワークACL）
 *
 * 責務: インシデント発生時にサブネット単位でトラフィックを即座に遮断
 * - インバウンド: 全て拒否
 * - アウトバウンド: 全て拒否
 *
 * SGとの違い:
 * - NACL: ステートレス → 即座にすべてのトラフィックを遮断（既存コネクションも含む）
 * - SG: ステートフル → 既存コネクションは維持される可能性がある
 *
 * 使用方法:
 * 1. 攻撃検知時に対象サブネットのNACLをこの隔離用NACLに付け替える
 * 2. 即座にすべてのトラフィック（既存コネクション含む）が遮断される
 *
 * 注意:
 * - サブネット単位での隔離となるため影響範囲が大きい
 * - 単一リソースの隔離にはSGを使用する
 * - サブネット全体の隔離が必要な場合に使用
 *
 * 変更頻度: ほぼなし
 */
export class IsolationNaclConstruct extends Construct {
  public readonly nacl: ec2.NetworkAcl;

  constructor(
    scope: Construct,
    id: string,
    props: IsolationNaclConstructProps
  ) {
    super(scope, id);

    const namePrefix = props.namePrefix || 'isolation';

    // 隔離用NACL
    this.nacl = new ec2.NetworkAcl(this, 'IsolationNacl', {
      vpc: props.vpc,
      networkAclName: `${namePrefix}-emergency-isolation-nacl`,
    });

    // デフォルトで全てのトラフィックを拒否
    // NACLはデフォルトで全拒否だが、明示的にDenyルールを追加することで意図を明確にする

    // インバウンド: 全て拒否（明示的）
    this.nacl.addEntry('DenyAllInbound', {
      ruleNumber: 100,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.allTraffic(),
      direction: ec2.TrafficDirection.INGRESS,
      ruleAction: ec2.Action.DENY,
    });

    // アウトバウンド: 全て拒否（明示的）
    this.nacl.addEntry('DenyAllOutbound', {
      ruleNumber: 100,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.allTraffic(),
      direction: ec2.TrafficDirection.EGRESS,
      ruleAction: ec2.Action.DENY,
    });

    // IPv6も拒否
    this.nacl.addEntry('DenyAllInboundIpv6', {
      ruleNumber: 101,
      cidr: ec2.AclCidr.anyIpv6(),
      traffic: ec2.AclTraffic.allTraffic(),
      direction: ec2.TrafficDirection.INGRESS,
      ruleAction: ec2.Action.DENY,
    });

    this.nacl.addEntry('DenyAllOutboundIpv6', {
      ruleNumber: 101,
      cidr: ec2.AclCidr.anyIpv6(),
      traffic: ec2.AclTraffic.allTraffic(),
      direction: ec2.TrafficDirection.EGRESS,
      ruleAction: ec2.Action.DENY,
    });

    // タグを追加して識別しやすくする
    Tags.of(this.nacl).add('Purpose', 'emergency-isolation');
    Tags.of(this.nacl).add('DoNotDelete', 'true');
    Tags.of(this.nacl).add(
      'Usage',
      'Associate with compromised subnets to isolate from network'
    );
  }

  /**
   * サブネットをこの隔離用NACLに関連付ける
   * 注意: これを実行するとサブネット内の全リソースが隔離される
   */
  associateWithSubnet(subnet: ec2.ISubnet): void {
    new ec2.SubnetNetworkAclAssociation(
      this,
      `Assoc-${subnet.node.id}`,
      {
        networkAcl: this.nacl,
        subnet: subnet,
      }
    );
  }
}

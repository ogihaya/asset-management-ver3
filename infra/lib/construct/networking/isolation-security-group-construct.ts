import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Tags } from 'aws-cdk-lib';

export interface IsolationSecurityGroupConstructProps {
  /**
   * VPC
   */
  vpc: ec2.IVpc;
  /**
   * 隔離用SGの名前プレフィックス
   * @default 'isolation'
   */
  namePrefix?: string;
}

/**
 * レイヤー1: IsolationSecurityGroupConstruct（緊急隔離用セキュリティグループ）
 *
 * 責務: インシデント発生時にリソースを即座にネットワークから隔離するためのSG
 * - インバウンド: 全て拒否
 * - アウトバウンド: 全て拒否
 *
 * 使用方法:
 * 1. 攻撃検知時に対象リソースのSGをこの隔離用SGに付け替える
 * 2. 既存のコネクションが切断され、新規接続も不可になる
 * 3. インスタンスを稼働させたままフォレンジック調査が可能
 *
 * 注意:
 * - 既存TCPコネクションは即座に切れない場合がある
 * - より確実な隔離にはNACLも併用を推奨
 *
 * 変更頻度: ほぼなし
 */
export class IsolationSecurityGroupConstruct extends Construct {
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(
    scope: Construct,
    id: string,
    props: IsolationSecurityGroupConstructProps
  ) {
    super(scope, id);

    const namePrefix = props.namePrefix || 'isolation';

    // 隔離用セキュリティグループ
    // allowAllOutbound: false でアウトバウンドも全て拒否
    // インバウンドはデフォルトで全て拒否
    this.securityGroup = new ec2.SecurityGroup(this, 'IsolationSG', {
      vpc: props.vpc,
      securityGroupName: `${namePrefix}-emergency-isolation-sg`,
      description:
        'Emergency isolation security group - No inbound/outbound traffic allowed. Use for incident response.',
      allowAllOutbound: false,
    });

    // タグを追加して識別しやすくする
    Tags.of(this.securityGroup).add('Purpose', 'emergency-isolation');
    Tags.of(this.securityGroup).add('DoNotDelete', 'true');
    Tags.of(this.securityGroup).add(
      'Usage',
      'Attach to compromised resources to isolate from network'
    );
  }
}

import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface SecurityGroupConstructProps {
  /**
   * セキュリティグループ名
   */
  securityGroupName: string;
  /**
   * VPC
   */
  vpc: ec2.IVpc;
  /**
   * 説明
   */
  description: string;
  /**
   * すべてのアウトバウンドを許可
   * @default true
   */
  allowAllOutbound?: boolean;
}

/**
 * レイヤー1: SecurityGroupConstruct（単一リソース）
 * 
 * 責務: 単一のセキュリティグループをセキュアなデフォルト設定で抽象化
 * - デフォルトでインバウンド拒否
 * - 明示的なルール追加が必要
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class SecurityGroupConstruct extends Construct {
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityGroupConstructProps) {
    super(scope, id);

    // SecurityGroup（L2コンストラクト）
    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      securityGroupName: props.securityGroupName,
      vpc: props.vpc,
      description: props.description,
      allowAllOutbound: props.allowAllOutbound !== false,
    });
  }

  /**
   * インバウンドルールを追加
   */
  addIngressRule(
    peer: ec2.IPeer,
    connection: ec2.Port,
    description?: string
  ): void {
    this.securityGroup.addIngressRule(peer, connection, description);
  }

  /**
   * アウトバウンドルールを追加
   */
  addEgressRule(
    peer: ec2.IPeer,
    connection: ec2.Port,
    description?: string
  ): void {
    this.securityGroup.addEgressRule(peer, connection, description);
  }
}


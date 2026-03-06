import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface BastionConstructProps {
  /**
   * Bastion ホスト名
   */
  bastionName: string;
  /**
   * VPC
   */
  vpc: ec2.IVpc;
  /**
   * インスタンスタイプ
   * @default t3.micro
   */
  instanceType?: ec2.InstanceType;
  /**
   * サブネット選択（デフォルト: パブリックサブネット）
   * @default PUBLIC
   */
  subnetType?: ec2.SubnetType;
  /**
   * SSH接続を許可するCIDR（セキュリティのため制限推奨）
   * @default undefined（どこからも許可しない、SSM経由のみ）
   */
  allowSshFrom?: string;
  /**
   * SSM Session Managerを有効化
   * @default true
   */
  enableSsm?: boolean;
}

/**
 * レイヤー1: Bastion ホスト Construct（単一リソース）
 *
 * 責務: 踏み台サーバーをセキュアなデフォルト設定で抽象化
 * - Amazon Linux 2023 (最新のセキュリティパッチ)
 * - SSM Session Manager対応（SSH不要でセキュア）
 * - 最小権限のIAMロール
 * - パブリックサブネット配置（SSH/SSM接続用）
 *
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class BastionConstruct extends Construct {
  public readonly instance: ec2.BastionHostLinux;
  public readonly securityGroup: ec2.ISecurityGroup;
  public readonly role: iam.IRole;

  constructor(scope: Construct, id: string, props: BastionConstructProps) {
    super(scope, id);

    const enableSsm = props.enableSsm ?? true;
    const subnetType = props.subnetType ?? ec2.SubnetType.PUBLIC;

    // Bastion Host（CDK L2コンストラクト）
    // Amazon Linux 2023がデフォルトで使用される（cdk.jsonのフィーチャーフラグ）
    this.instance = new ec2.BastionHostLinux(this, 'BastionHost', {
      vpc: props.vpc,
      instanceName: props.bastionName,
      instanceType:
        props.instanceType ??
        ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      subnetSelection: {
        subnetType,
      },
      // SSM Session Managerを使用する場合はパブリックIPが不要
      // ただしパブリックサブネットの場合はあった方が便利
      requireImdsv2: true, // セキュリティ: IMDSv2を強制
    });

    this.securityGroup = this.instance.connections.securityGroups[0];
    this.role = this.instance.role;

    // SSH接続許可（指定された場合のみ）
    if (props.allowSshFrom) {
      this.instance.allowSshAccessFrom(ec2.Peer.ipv4(props.allowSshFrom));
    }

    // SSM Session Manager用のポリシー追加
    if (enableSsm) {
      this.role.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
      );
    }

    // CloudFormation削除時の動作
    this.instance.instance.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }

  /**
   * 指定されたセキュリティグループへのアクセスを許可
   * （例: RDSセキュリティグループへのingress追加）
   */
  allowConnectionTo(
    targetSecurityGroup: ec2.ISecurityGroup,
    port: ec2.Port,
    description?: string
  ): void {
    targetSecurityGroup.addIngressRule(
      this.securityGroup,
      port,
      description ?? `Allow access from Bastion host`
    );
  }

  /**
   * PostgreSQLへのアクセスを許可（ポート5432）
   */
  allowPostgresAccess(
    targetSecurityGroup: ec2.ISecurityGroup,
    description?: string
  ): void {
    this.allowConnectionTo(
      targetSecurityGroup,
      ec2.Port.tcp(5432),
      description ?? 'Allow PostgreSQL access from Bastion host'
    );
  }

  /**
   * MySQLへのアクセスを許可（ポート3306）
   */
  allowMysqlAccess(
    targetSecurityGroup: ec2.ISecurityGroup,
    description?: string
  ): void {
    this.allowConnectionTo(
      targetSecurityGroup,
      ec2.Port.tcp(3306),
      description ?? 'Allow MySQL access from Bastion host'
    );
  }
}

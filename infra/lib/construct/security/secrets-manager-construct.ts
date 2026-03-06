import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { RemovalPolicy, SecretValue } from 'aws-cdk-lib';

export interface SecretsManagerConstructProps {
  /**
   * シークレット名
   */
  secretName: string;
  /**
   * 説明
   */
  description?: string;
  /**
   * 初期値（JSONオブジェクト）
   */
  generateSecretString?: secretsmanager.SecretStringGenerator;
}

/**
 * レイヤー1: Secrets ManagerConstruct（単一リソース）
 * 
 * 責務: 単一のSecrets Managerシークレットをセキュアなデフォルト設定で抽象化
 * - 自動ローテーション対応
 * - 暗号化保存
 * 
 * 変更頻度: ほぼなし（AWSベストプラクティスの更新時のみ）
 */
export class SecretsManagerConstruct extends Construct {
  public readonly secret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: SecretsManagerConstructProps) {
    super(scope, id);

    // Secrets Manager Secret（L2コンストラクト）
    this.secret = new secretsmanager.Secret(this, 'Secret', {
      secretName: props.secretName,
      description: props.description || `Secret for ${props.secretName}`,
      generateSecretString: props.generateSecretString || {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
      },
      removalPolicy: RemovalPolicy.DESTROY, // 開発環境用
    });
  }

  /**
   * シークレット値を取得
   */
  get secretValue(): SecretValue {
    return this.secret.secretValue;
  }
}


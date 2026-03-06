#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getConfig } from '../config';
import { PocStack } from '../lib/stack/poc/poc-stack';

/**
 * PoC用アプリケーション
 * 
 * 小規模プロジェクト（MVP、PoC）向けの単一スタック構成
 * すべてのリソースを1つのスタックにまとめることで、シンプルで管理しやすい構成を実現
 * 
 * 使用方法:
 * ```bash
 * # デプロイ
 * cdk deploy -a "npx ts-node bin/poc-app.ts" --context env=dev
 * 
 * # 削除
 * cdk destroy -a "npx ts-node bin/poc-app.ts" --context env=dev
 * 
 * # synth
 * cdk synth -a "npx ts-node bin/poc-app.ts" --context env=dev
 * ```
 * 
 * または、package.jsonにスクリプトを追加:
 * ```json
 * "scripts": {
 *   "poc:deploy": "cdk deploy -a 'npx ts-node bin/poc-app.ts' --context env=dev",
 *   "poc:destroy": "cdk destroy -a 'npx ts-node bin/poc-app.ts' --context env=dev",
 *   "poc:diff": "cdk diff -a 'npx ts-node bin/poc-app.ts' --context env=dev"
 * }
 * ```
 * 
 * プロジェクトが成長したら、bin/app.tsの7スタック構成に移行できます
 * 
 * 詳細: docs/POC_SETUP_GUIDE.md
 * 移行ガイド: docs/MIGRATION_GUIDE.md
 */

const app = new cdk.App();

// 環境名の取得
const envName = app.node.tryGetContext('env') || process.env.ENV_NAME || 'dev';
console.log(`🚀 Deploying PoC Stack to: ${envName}`);

// 環境設定の読み込み
const config = getConfig(envName);

// アカウントIDを環境変数から取得（configが空の場合）
const account = config.account || process.env.CDK_DEFAULT_ACCOUNT;
const region = config.region || process.env.CDK_DEFAULT_REGION || 'ap-northeast-1';

// Stack共通のprops
const stackProps: cdk.StackProps = {
  env: {
    account,
    region,
  },
  description: `PoC Stack (${envName}) - AllInOne configuration for MVP/PoC projects`,
};

// ========================================
// PoC Stack（単一スタック構成）
// ========================================
const pocStack = new PocStack(
  app,
  `${config.envName}-PocStack`,
  config,
  {
    ...stackProps,
    systemName: 'cdk-template-poc',
    enableMonitoring: false, // 💡 PoC推奨: 初期段階では監視を無効化（必要になったらtrueに変更）
  }
);

// アプリケーション全体のタグ
cdk.Tags.of(app).add('Project', 'cdk-template-poc');
cdk.Tags.of(app).add('Environment', config.envName);
cdk.Tags.of(app).add('Architecture', 'AllInOne');
cdk.Tags.of(app).add('Purpose', 'PoC');
cdk.Tags.of(app).add('ManagedBy', 'AWS CDK');

console.log('✅ PoC Stack definition completed');
console.log(`📦 Stack: ${config.envName}-PocStack`);
console.log('📝 This is an AllInOne configuration - all resources in a single stack');
console.log('💡 For production, consider using the 7-stack configuration (bin/app.ts)');


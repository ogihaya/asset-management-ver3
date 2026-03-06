import { EnvironmentConfig } from './environment';
import { devConfig } from './dev';
import { stgConfig } from './stg';
import { prodConfig } from './prod';

/**
 * 環境設定を取得
 */
export function getConfig(envName: string): EnvironmentConfig {
  switch (envName.toLowerCase()) {
    case 'dev':
    case 'development':
      return devConfig;
    case 'stg':
    case 'staging':
      return stgConfig;
    case 'prod':
    case 'production':
      return prodConfig;
    default:
      throw new Error(`Unknown environment: ${envName}`);
  }
}

export { EnvironmentConfig, devConfig, stgConfig, prodConfig };


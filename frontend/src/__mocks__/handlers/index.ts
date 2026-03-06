/**
 * MSW ハンドラー統合ファイル
 *
 * 新しいエンティティのハンドラーを追加する場合:
 * 1. handlers/[entity].ts を作成
 * 2. このファイルでインポートして handlers 配列に追加
 * 3. 必要に応じてエラーハンドラー生成関数を re-export
 */

import { authHandlers } from './auth';
// import { userHandlers } from './user';
// import { productHandlers } from './product';

export const handlers = [
  ...authHandlers,
  // ...userHandlers,
  // ...productHandlers,
];

// エラーハンドラー生成関数を re-export
export {
  createLoginErrorHandler,
  createLogoutErrorHandler,
  createAuthStatusHandler,
} from './auth';

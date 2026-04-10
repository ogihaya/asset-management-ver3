# AUTH_IMPLEMENTATION_DETAIL

## 0. 位置づけ

本書は、認証まわりで実装時に迷いやすい判断を固定するための詳細設計メモである。正本は以下とし、本書はその補助として扱う。

- [API_SPECIFICATION.md](./API_SPECIFICATION.md)
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

本書で固定するのは、公開仕様を変更しない範囲の実装判断である。

## 1. 現状差分

| 論点 | 現行実装 | v1 正式方針 |
| --- | --- | --- |
| ログイン識別子 | `login_id` | `email` |
| 認証 Cookie | `access_token` | `asset_management_session` |
| 認証方式 | PoC 的な token cookie | DB 永続化された Cookie session |
| `/auth/status` | `is_authenticated` 前提の暫定型 | `data.authenticated` 前提の正式レスポンス |
| パスワード再設定 | 未実装 | request/reset を正式提供 |
| frontend guard | `/dashboard` のみ保護 | `/dashboard` `/monthly-record` `/life-plan` `/settings` を保護 |
| signup 後の扱い | 未定 | 自動ログインしない。`/login` へ戻す |

## 2. 固定する実装判断

### 2.1 Cookie session

- Cookie 名は `asset_management_session` とする。
- Cookie 属性は公開仕様どおり `HttpOnly`、`SameSite=Lax`、HTTPS 環境では `Secure` を付与する。
- Cookie の `Path` は `/`、有効期限は 30 日とする。
- Cookie に入れるのは平文セッショントークンのみとし、DB には `session_token_hash` のみ保存する。
- 1 回の login で 1 session を作成する。複数端末ログインは session 行の複数保持で表現する。

### 2.2 Session 検証と延長

- 認証が必要な全 API で session を検証する。
- 検証条件は以下をすべて満たすこと。
  - Cookie が存在する
  - `session_token_hash` が一致する
  - `revoked_at` が `null`
  - `expires_at > now`
  - `users.deleted_at` が `null`
- `expires_at` の延長判定も全認証済み API で行うが、DB 更新は最大 1 日 1 回に抑える。
- 更新条件は `last_seen_at IS NULL` または `last_seen_at <= now - 1 day` とする。
- 延長時は `last_seen_at = now`、`expires_at = now + 30 days` を同時に更新する。
- 条件を満たさない通常アクセスでは read only とし、毎回 `expires_at` を更新しない。

### 2.3 `/auth/status` の扱い

- Cookie 自体が無い場合は `200` で `authenticated: false` を返す。
- Cookie はあるが session が見つからない、`revoked_at` 済み、または退会済みユーザーの場合も `200` で `authenticated: false` を返す。
- Cookie はあり、対応する session が存在するが `expires_at <= now` の場合だけ `401 SESSION_EXPIRED` を返す。
- `SESSION_EXPIRED` を返したときは Cookie 削除も同時に行う。

### 2.4 Signup / Login / Logout / Delete Me

- signup は `users` に作成するだけで、session は作らない。
- signup 成功後の画面遷移は `frontend` 側で `/login` へ戻す。
- login 成功時は password を検証し、session を作成して Cookie を返す。
- logout は「現在の Cookie に対応する 1 session だけ」を `revoked_at=now` にする。
- `DELETE /users/me` は以下を行う。
  - `users.deleted_at=now`
  - そのユーザーの未失効 session をすべて `revoked_at=now`
  - 現在の Cookie を削除
- 退会後も `users.email` は再利用不可とする。

### 2.5 Password Reset

- `POST /auth/password-reset/request` は、存在しないメールアドレスでも常に成功レスポンスを返す。
- 実在かつ未削除ユーザーが存在する場合のみ、以下を行う。
  - そのユーザーの `used_at IS NULL AND expires_at > now` な token をすべて `used_at=now` にして無効化する
  - 新しい reset token を 1 件作成する
  - `expires_at = now + 1 hour`
  - 平文 token を含む reset URL を組み立てる
- `POST /auth/password-reset/reset` は以下を行う。
  - token hash 一致
  - `used_at IS NULL`
  - `expires_at > now`
  - 対象 user が未削除
  - `new_password` と `new_password_confirmation` が一致
  - password 強度を満たす
- reset 成功時は以下を行う。
  - `users.password_hash` 更新
  - 対象 token の `used_at=now`
  - 対象 user の有効 session をすべて `revoked_at=now`
- reset 成功後、自動ログインは行わない。

### 2.6 メール送信

- `stg` と `prod` は SES 送信を前提とする。
- `dev` は SES 未設定時のみ fallback を許可する。
- fallback 時の API レスポンスは本番と同じにし、画面にも token を表示しない。
- fallback 時は backend アプリケーションログへ reset URL を 1 回だけ出力する。
- ログには raw token を含む URL を出すが、dev 限定とし、`stg` と `prod` では絶対に出さない。

## 3. レイヤ責務

| レイヤ | 責務 |
| --- | --- |
| `domain` | `User`、`UserSession`、`PasswordResetToken` のルール、repository interface |
| `application` | signup/login/logout/status/delete me/password reset request/reset の use case |
| `infrastructure` | SQLAlchemy model、repository 実装、password hash、token 生成、SES mail sender |
| `presentation` | request/response schema、Cookie 制御、error code 変換 |
| `frontend entities/auth` | auth API client、DTO 型、変換 |
| `frontend features/auth/*` | login/signup/logout/request/reset の操作単位 |
| `frontend app/middleware` | route guard と redirect |

backend 側では少なくとも以下の interface を持つ前提で実装する。

- `UserRepository`
- `UserSessionRepository`
- `PasswordResetTokenRepository`
- `PasswordHashService`
- `SessionTokenService`
- `PasswordResetMailer`

## 4. Frontend 実装判断

### 4.1 保護対象と公開対象

- 保護対象 route は `/dashboard` `/monthly-record` `/life-plan` `/settings` とする。
- 公開 route は `/login` `/signup` `/password-reset/request` `/password-reset/reset` とする。
- middleware は `asset_management_session` Cookie を backend `/auth/status` へそのまま転送して検証する。
- middleware は Cookie の中身を decode しない。

### 4.2 型と state

- `entities/auth/model/types.ts` は正式 API 形状に合わせて作り直す。
- login request は `{ email, password }` とする。
- auth status は `data.authenticated` と `data.user` を正とする。
- Redux の auth slice は以下のみを持つ。
  - `user`
  - `isAuthenticated`
  - `isLoading`
- `access_token` や `login_id` を frontend state に持たない。

### 4.3 画面遷移

- login 成功時は `/dashboard` へ遷移する。
- signup 成功時は `/login` へ戻し、完了メッセージを表示する。
- password reset request 成功時は同ページに成功メッセージを表示する。
- password reset reset 成功時は `/login` へ戻す。
- `401 SESSION_EXPIRED` を受けたら auth state を破棄し、`/login` へ遷移する。

## 5. テスト観点

### 5.1 Backend

- signup が session を作らないこと
- login が session を 1 件作成し Cookie を返すこと
- logout が current session だけを失効すること
- 複数端末 login が同時に成立すること
- `last_seen_at` が 1 日未満なら `expires_at` を更新しないこと
- `last_seen_at` が 1 日以上前なら `expires_at` を延長すること
- expired session の `/auth/status` が `401 SESSION_EXPIRED` になること
- revoked session の `/auth/status` が `200 authenticated=false` になること
- password reset request が未登録メールでも成功レスポンスになること
- password reset request が古い token を無効化すること
- password reset reset 成功時に token が再利用不可になること
- password reset reset 成功時に既存 session が全失効すること
- delete me が論理削除と全 session 失効を行うこと

### 5.2 Frontend

- public route で認証済みなら `/dashboard` へ戻すこと
- protected route で未認証なら `/login` へ送ること
- `SESSION_EXPIRED` で store を clear して `/login` へ遷移すること
- signup 後に自動ログインしないこと
- password reset request の成功時に token を UI 表示しないこと

## 6. 推奨 PR 分割

1. backend の session 基盤と repository 追加
2. signup/login/logout/status/delete me の正式化
3. password reset と mailer 導入
4. frontend の auth 型、middleware、4 画面、テスト更新

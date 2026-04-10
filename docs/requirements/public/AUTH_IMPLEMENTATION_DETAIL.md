# AUTH_IMPLEMENTATION_DETAIL

## 0. 位置づけ

本書は、認証まわりで実装時に迷いやすい判断を固定するための詳細設計メモである。正本は以下とし、本書はその補助として扱う。

- [API_SPECIFICATION.md](./API_SPECIFICATION.md)
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

本書で固定するのは、公開仕様を変更しない範囲の実装判断である。  
IMP-001 の成果物として、現行 auth PoC と正式仕様の差分、影響範囲、置換方針、後続タスクへの引き継ぎ条件をここに集約する。

## 1. 現行コード観察結果

### 1.1 Backend

- `backend/app/presentation/api/auth_api.py` は `POST /auth/login` `POST /auth/logout` `GET /auth/status` の 3 本だけを提供している。
- login request は `login_id` と `password` を受け取り、login response は `message` `access_token` `user_id` を返している。
- login 成功時は `access_token` Cookie を 7 日で発行し、logout はその Cookie を削除するだけである。
- `GET /auth/status` は `is_authenticated` と `user_id` を返す暫定形で、正式仕様の `data.authenticated` とは契約が異なる。
- `backend/app/application/use_cases/auth_usecase.py` は `admin/pass` をハードコードした PoC であり、DB 上の user 検索や session 永続化をまだ使っていない。
- `backend/app/domain/entities/user.py`、`backend/app/domain/repositories/user_repository.py`、`backend/app/infrastructure/db/models/user_model.py` は `login_id` 前提の設計になっている。
- `backend/app/infrastructure/security/security_service_impl.py` は RS256 JWT を `access_token` Cookie から読む構成で、DB 永続化された session は未実装である。
- `backend/tests/presentation/test_auth_api.py` と `backend/tests/application/test_auth_usecase.py` も旧契約を前提に固定されている。

### 1.2 Frontend

- `frontend/src/entities/auth/model/types.ts` は `LoginRequest.login_id`、`LoginResponse.access_token`、`StatusResponse.is_authenticated` を前提にしている。
- `frontend/src/entities/auth/api/auth-api.ts` と `frontend/src/features/auth/login/lib/use-login.ts` は `login_id` を送信する実装である。
- `frontend/src/middleware.ts` は `access_token` Cookie を前提に `/auth/status` を叩き、`response.ok` を認証成功とみなしている。
- middleware の保護対象 route は `/dashboard` のみであり、`/monthly-record` `/life-plan` `/settings` は未保護である。
- `frontend/src/__tests__/middleware.test.ts` と `frontend/src/entities/auth/__tests__/auth-api.test.ts` も旧契約に依存している。
- 本実装側の route は主に `/login` と `/dashboard` で、signup と password reset の正式画面はまだ実装されていない。

## 2. 差分一覧

| 論点 | 現行 backend | 現行 frontend | 正式仕様 | 採用方針 |
| --- | --- | --- | --- | --- |
| ログイン識別子 | `login_id` を受け取る | `login_id` を送る | `email` を使う | `login_id` は維持せず `email` に統一する |
| login 成功レスポンス | `message` `access_token` `user_id` | 同 shape を前提に state 更新 | `data.user` と `meta.session_expires_in_days` | response body から `access_token` を排除し正式 shape に合わせる |
| 認証 Cookie 名 | `access_token` | `access_token` を読む | `asset_management_session` | Cookie 名を正式仕様へ置換する |
| 認証方式 | JWT を Cookie に入れる PoC | Cookie の存在と `response.ok` に依存 | DB 永続化された Cookie session | JWT access token cookie の増築はせず session 方式へ置換する |
| session 有効期限 | 7 日 | 7 日前提の UI なし | 30 日 | backend/frontend とも 30 日前提へ切り替える |
| `/auth/status` 正常系 shape | `is_authenticated` `user_id` | `StatusResponse.is_authenticated` | `data.authenticated` と `data.user` | top-level `is_authenticated` は廃止する |
| `/auth/status` 未認証時 | 実質 `401` 依存が混在 | `response.ok` だけで判定 | Cookie 無しや revoked は `200 authenticated=false` | expired のみ `401 SESSION_EXPIRED`、それ以外の未認証は `200 false` にそろえる |
| signup | 未実装 | 未実装 | `POST /auth/signup` を提供 | IMP-003/004 で正式追加する |
| password reset | 未実装 | 未実装 | request/reset を提供 | IMP-003/004 で正式追加する |
| `GET /users/me` / `DELETE /users/me` | 未実装 | 未実装 | 正式 API に含まれる | auth API と同じ phase で追加する |
| 保護対象 route | backend 側で限定なし | `/dashboard` のみ保護 | `/dashboard` `/monthly-record` `/life-plan` `/settings` | middleware の保護範囲を正式仕様に合わせる |
| 公開 auth route | backend は `/login` 相当のみ | `/login` のみ実装 | `/login` `/signup` `/password-reset/request` `/password-reset/reset` | frontend は 4 画面を正式追加する |
| signup 後の扱い | 未実装 | 未実装 | 自動ログインしない | signup 完了後は `/login` に戻す |
| frontend auth state | token 系値を保持可能な前提 | `access_token` と旧型に依存 | `user` と `authenticated` を正とする | frontend state に `access_token` を持たない |

## 3. 影響範囲

### 3.1 Backend

| レイヤ | 主な影響対象 |
| --- | --- |
| `presentation` | `backend/app/presentation/api/auth_api.py`, `backend/app/presentation/schemas/auth_schemas.py` |
| `application` | `backend/app/application/schemas/auth_schemas.py`, `backend/app/application/use_cases/auth_usecase.py` |
| `domain` | `backend/app/domain/entities/user.py`, `backend/app/domain/repositories/user_repository.py` |
| `infrastructure` | `backend/app/infrastructure/db/models/user_model.py`, `backend/app/infrastructure/db/repositories/user_repository_impl.py`, `backend/app/infrastructure/security/security_service_impl.py` |
| `tests` | `backend/tests/presentation/test_auth_api.py`, `backend/tests/application/test_auth_usecase.py` |

backend では、PoC を正式仕様に「増築」するのではなく、request/response、Cookie、認証方式、永続化前提をまとめて置き換える前提で進める。

### 3.2 Frontend

| レイヤ | 主な影響対象 |
| --- | --- |
| `entities` | `frontend/src/entities/auth/model/types.ts`, `frontend/src/entities/auth/api/auth-api.ts` |
| `features` | `frontend/src/features/auth/login/**` |
| `store` | `frontend/src/store/slices/authSlice.ts` |
| `middleware` | `frontend/src/middleware.ts` |
| `routes` | `frontend/src/app/login/**`, `frontend/src/app/dashboard/**` と今後追加する signup/password reset routes |
| `tests` | `frontend/src/__tests__/middleware.test.ts`, `frontend/src/entities/auth/__tests__/auth-api.test.ts` |

frontend でも旧契約への互換層は原則作らず、正式 API を正として型、API client、middleware、route guard を更新する。

## 4. 置換方針

### 4.1 維持しない旧契約

- `login_id`
- `access_token` Cookie
- response body の `access_token`
- top-level `is_authenticated`
- `/dashboard` だけを保護する middleware
- signup 後の自動ログインを許す余地
- JWT access token cookie を中心にした PoC 認証方式

### 4.2 Cookie session

- Cookie 名は `asset_management_session` とする。
- Cookie 属性は公開仕様どおり `HttpOnly`、`SameSite=Lax`、HTTPS 環境では `Secure` を付与する。
- Cookie の `Path` は `/`、有効期限は 30 日とする。
- Cookie に入れるのは平文セッショントークンのみとし、DB には `session_token_hash` のみ保存する。
- 1 回の login で 1 session を作成する。複数端末ログインは session 行の複数保持で表現する。

### 4.3 Session 検証と延長

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

### 4.4 `/auth/status` の扱い

- Cookie 自体が無い場合は `200` で `authenticated: false` を返す。
- Cookie はあるが session が見つからない、`revoked_at` 済み、または退会済みユーザーの場合も `200` で `authenticated: false` を返す。
- Cookie はあり、対応する session が存在するが `expires_at <= now` の場合だけ `401 SESSION_EXPIRED` を返す。
- `SESSION_EXPIRED` を返したときは Cookie 削除も同時に行う。

### 4.5 Signup / Login / Logout / Users Me / Delete Me

- signup は `users` に作成するだけで、session は作らない。
- signup 成功後の画面遷移は `frontend` 側で `/login` へ戻す。
- login 成功時は password を検証し、session を作成して Cookie を返す。
- logout は「現在の Cookie に対応する 1 session だけ」を `revoked_at=now` にする。
- `GET /users/me` は認証済み user の情報を正式仕様どおり返す。
- `DELETE /users/me` は以下を行う。
  - `users.deleted_at=now`
  - そのユーザーの未失効 session をすべて `revoked_at=now`
  - 現在の Cookie を削除
- 退会後も `users.email` は再利用不可とする。

### 4.6 Password Reset

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

### 4.7 メール送信

- `stg` と `prod` は SES 送信を前提とする。
- `dev` は SES 未設定時のみ fallback を許可する。
- fallback 時の API レスポンスは本番と同じにし、画面にも token を表示しない。
- fallback 時は backend アプリケーションログへ reset URL を 1 回だけ出力する。
- ログには raw token を含む URL を出すが、dev 限定とし、`stg` と `prod` では絶対に出さない。

### 4.8 Frontend 実装判断

- 保護対象 route は `/dashboard` `/monthly-record` `/life-plan` `/settings` とする。
- 公開 route は `/login` `/signup` `/password-reset/request` `/password-reset/reset` とする。
- middleware は `asset_management_session` Cookie を backend `/auth/status` へそのまま転送して検証する。
- middleware は Cookie の中身を decode しない。
- `entities/auth/model/types.ts` は正式 API 形状に合わせて作り直す。
- login request は `{ email, password }` とする。
- auth status は `data.authenticated` と `data.user` を正とする。
- Redux の auth slice は `user` `isAuthenticated` `isLoading` のみを持つ。
- `access_token` や `login_id` を frontend state に持たない。
- login 成功時は `/dashboard` へ遷移する。
- signup 成功時は `/login` へ戻し、完了メッセージを表示する。
- password reset request 成功時は同ページに成功メッセージを表示する。
- password reset reset 成功時は `/login` へ戻す。
- `401 SESSION_EXPIRED` を受けたら auth state を破棄し、`/login` へ遷移する。

## 5. 後続タスクへの引き継ぎ条件

### 5.1 IMP-002

- `users` `user_sessions` `password_reset_tokens` を前提に DB モデルと Alembic migration を設計する。
- `login_id` 前提の列や repository 契約を追加しない。
- session は JWT の保存先ではなく、DB 永続化された session 行として実装する。

### 5.2 IMP-003

- backend auth は PoC の拡張ではなく正式仕様への置換として実装する。
- `auth_api.py`、schema、use case、security service、repository を `email + cookie session` 前提で更新する。
- `access_token` 発行型の API や互換 endpoint は追加しない。

### 5.3 IMP-004

- frontend の auth types、API client、middleware、route guard を正式 API に合わせて更新する。
- `/signup` `/password-reset/request` `/password-reset/reset` を正式な public route として追加する。
- `login_id` や `access_token` 互換の変換層は原則作らない。

## 6. レイヤ責務

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

## 7. テスト観点

### 7.1 Backend

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

### 7.2 Frontend

- public route で認証済みなら `/dashboard` へ戻すこと
- protected route で未認証なら `/login` へ送ること
- `SESSION_EXPIRED` で store を clear して `/login` へ遷移すること
- signup 後に自動ログインしないこと
- password reset request の成功時に token を UI 表示しないこと

## 8. 推奨 PR 分割

1. backend の session 基盤と repository 追加
2. signup/login/logout/status/delete me の正式化
3. password reset と mailer 導入
4. frontend の auth 型、middleware、4 画面、テスト更新

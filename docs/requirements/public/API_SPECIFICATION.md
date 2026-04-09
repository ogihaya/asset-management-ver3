# API仕様書

> 本書は v1 の正式API仕様を定義する。現行 backend 実装は一部エンドポイントのみ実装済みだが、実装状況ではなく本書の定義を正とする。

## 1. 共通仕様
### 1.1 ベースURL
- ベースURLは `/api/v1` とする。
- 本書に記載するパスは、すべて `/api/v1` 配下の相対パスとして扱う。

### 1.2 認証方式
- 認証は Cookie session 方式とする。
- ログイン成功時に、`HttpOnly` な Cookie にセッショントークンを設定する。
- Cookie 名は `asset_management_session` とする。
- Cookie の `SameSite` は `Lax` とする。
- HTTPS 環境では Cookie に `Secure` 属性を付与する。
- 認証が必要なAPIでは、ブラウザが Cookie を自動送信する前提とする。
- セッション有効期限は 30 日とする。
- 複数端末からの同時ログインを許可する。
- セッション有効期限は、認証系APIアクセス時に延長してよい。

### 1.3 共通ヘッダー
- リクエスト:
  - `Content-Type: application/json`
- 認証付きAPI:
  - 認証Cookieを送信する
- レスポンス:
  - `Content-Type: application/json`

### 1.4 共通レスポンス形式
#### 成功時
```json
{
  "data": {},
  "meta": {}
}
```

- `data`: 本体データ。単一オブジェクトまたは配列を返す。
- `meta`: 補足情報。未使用時は空オブジェクトを返してよい。

#### 失敗時
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります。",
    "details": {
      "field": "email"
    }
  }
}
```

- `error.code`: エラー種別を示す機械可読コード。
- `error.message`: 画面表示に使う要約メッセージ。
- `error.details`: フィールド単位や補足情報が必要な場合のみ返す。
- 画面分岐や入力補助が必要な場合は、`message` ではなく `code` と `details` を参照する。

### 1.5 ページネーション
- v1 ではページネーションを必須としない。
- 一覧APIはユーザー単位の件数が小さい前提で全件返却する。
- 将来ページネーションが必要になった場合は `meta` に拡張する。

### 1.6 月の識別子
- 月次系APIの `month` は `YYYY-MM` 形式で表す。
- 例: `2026-04`

### 1.7 ステータスコード一覧
| コード | 意味 | 使用場面 |
|---|---|---|
| `200` | OK | 取得、更新、実行成功 |
| `201` | Created | 新規登録成功 |
| `204` | No Content | 削除成功で本文不要 |
| `400` | Bad Request | 形式不正、必須不足 |
| `401` | Unauthorized | 未ログイン、セッション失効 |
| `403` | Forbidden | 操作不可、対象月が確定済みなど |
| `404` | Not Found | 対象リソースが存在しない |
| `409` | Conflict | 名称重複、比率合計不整合、順番確定違反 |
| `422` | Unprocessable Entity | バリデーションエラー |

### 1.8 エラーコード例
| code | 用途 |
|---|---|
| `VALIDATION_ERROR` | 入力値不正 |
| `UNAUTHORIZED` | 未認証 |
| `SESSION_EXPIRED` | セッション期限切れ |
| `FORBIDDEN` | 権限または状態不一致 |
| `NOT_FOUND` | 対象なし |
| `DUPLICATE_NAME` | 同一ユーザー内の名称重複 |
| `MONTH_NOT_CONFIRMABLE` | 月次確定不可 |
| `ALLOCATION_TOTAL_INVALID` | 配分比率合計が100.00%でない |
| `PASSWORD_RESET_TOKEN_INVALID` | 再設定トークン不正 |
| `PASSWORD_RESET_TOKEN_EXPIRED` | 再設定トークン期限切れ |

## 2. 認証・アカウントAPI
### 2.1 `POST /auth/signup`
- **説明**: メールアドレスとパスワードで新規登録する。
- **リクエスト**:
```json
{
  "email": "user@example.com",
  "password": "Passw0rd"
}
```
- **バリデーション**:
  - `email`: 必須、メール形式、一意
  - `password`: 必須、8文字以上、英数字混在
- **レスポンス例** (`201`):
```json
{
  "data": {
    "user_id": 1,
    "email": "user@example.com"
  },
  "meta": {
    "message": "ユーザー登録が完了しました。"
  }
}
```
- **主要エラー**:
  - `409 DUPLICATE_NAME`: メールアドレス重複
  - `422 VALIDATION_ERROR`: パスワード要件不一致

### 2.2 `POST /auth/login`
- **説明**: メールアドレスとパスワードでログインする。
- **リクエスト**:
```json
{
  "email": "user@example.com",
  "password": "Passw0rd"
}
```
- **レスポンス例** (`200`):
```json
{
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com"
    }
  },
  "meta": {
    "message": "ログインしました。",
    "session_expires_in_days": 30
  }
}
```
- **補足**:
  - レスポンス本文とは別に、認証Cookieを設定する。
- **主要エラー**:
  - `401 UNAUTHORIZED`: 認証失敗

### 2.3 `POST /auth/logout`
- **説明**: 現在のセッションをログアウトする。
- **リクエスト**: なし
- **レスポンス例** (`200`):
```json
{
  "data": {
    "logged_out": true
  },
  "meta": {
    "message": "ログアウトしました。"
  }
}
```
- **補足**:
  - 認証Cookieを削除する。

### 2.4 `GET /auth/status`
- **説明**: 現在のセッション状態を確認する。
- **リクエスト**: なし
- **認証済みレスポンス例** (`200`):
```json
{
  "data": {
    "authenticated": true,
    "user": {
      "id": 1,
      "email": "user@example.com"
    }
  },
  "meta": {}
}
```
- **未ログイン時レスポンス例** (`200`):
```json
{
  "data": {
    "authenticated": false,
    "user": null
  },
  "meta": {}
}
```
- **失効時レスポンス例** (`401`):
```json
{
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "セッションの有効期限が切れました。再度ログインしてください。",
    "details": {}
  }
}
```
- **補足**:
  - 通常の未ログイン状態は `200` で返す。
  - セッション期限切れのみ `401 SESSION_EXPIRED` を返す。

### 2.5 `POST /auth/password-reset/request`
- **説明**: パスワード再設定メール送信を開始する。
- **リクエスト**:
```json
{
  "email": "user@example.com"
}
```
- **レスポンス例** (`200`):
```json
{
  "data": {
    "requested": true
  },
  "meta": {
    "message": "再設定メールを送信しました。"
  }
}
```
- **補足**:
  - 登録有無を推測しにくくするため、メールアドレス未登録でも同じ成功メッセージを返してよい。

### 2.6 `POST /auth/password-reset/reset`
- **説明**: 再設定トークンを用いて新しいパスワードを保存する。
- **リクエスト**:
```json
{
  "token": "reset-token",
  "new_password": "NewPassw0rd",
  "new_password_confirmation": "NewPassw0rd"
}
```
- **バリデーション**:
  - `new_password`: FR-001 と同じ強度要件
  - `new_password_confirmation`: 一致必須
- **レスポンス例** (`200`):
```json
{
  "data": {
    "password_reset": true
  },
  "meta": {
    "message": "パスワードを再設定しました。"
  }
}
```
- **主要エラー**:
  - `401 PASSWORD_RESET_TOKEN_INVALID`
  - `401 PASSWORD_RESET_TOKEN_EXPIRED`
  - `422 VALIDATION_ERROR`
- **補足**:
  - 再設定成功後に自動ログインは行わない。
  - 画面はログイン画面へ戻す前提とする。

### 2.7 `GET /users/me`
- **説明**: ログイン中ユーザーの最小プロフィールを取得する。
- **レスポンス例** (`200`):
```json
{
  "data": {
    "id": 1,
    "email": "user@example.com"
  },
  "meta": {}
}
```

### 2.8 `DELETE /users/me`
- **説明**: 自分のアカウントを論理削除する。
- **リクエスト**: なし
- **レスポンス例** (`200`):
```json
{
  "data": {
    "deleted": true
  },
  "meta": {
    "message": "アカウントを削除しました。"
  }
}
```
- **補足**:
  - 退会後、全セッションを無効化する。
  - `asset_management_session` Cookie を削除する。
  - 削除済みメールアドレスは再利用不可とする。

## 3. ダッシュボードAPI
### 3.1 `GET /dashboard`
- **説明**: ダッシュボード上段カード群と、各カードの表示に必要な集約データを取得する。
- **レスポンス例** (`200`):
```json
{
  "data": {
    "analysis_month": "2026-04",
    "kpis": {
      "total_assets_yen": 3250000,
      "monthly_income_yen": 420000,
      "resolved_expense_yen": 260000,
      "investable_amount_yen": 70000
    },
    "asset_summary": {
      "regular_assets_total_yen": 1750000,
      "top_assets": [
        {
          "asset_id": 1,
          "name": "住信SBIネット銀行",
          "value_yen": 1200000,
          "ratio_percent": 36.92,
          "is_liability": false
        }
      ],
      "remaining_count": 2,
      "all_assets": []
    },
    "investment_composition": {
      "total_valuation_yen": 1500000,
      "targets": [
        {
          "investment_target_id": 1,
          "name": "eMAXIS Slim 全世界株式",
          "actual_ratio_percent": 50.25,
          "ideal_ratio_percent": 50.00,
          "delta_percent_point": 0.25,
          "valuation_yen": 753750
        }
      ]
    },
    "investment_decision": {
      "forecast_monthly_income_yen": 410000,
      "forecast_monthly_expense_yen": 255000,
      "sample_months": 6,
      "investable_amount_yen": 70000,
      "cumulative_income_yen": 2460000,
      "cumulative_expense_yen": 1620000,
      "surplus_assets_yen": 540000,
      "emergency_fund_yen": 1000000,
      "adopted_event": {
        "month": "2027-01",
        "title": "引っ越し費用"
      },
      "allocations": [
        {
          "investment_target_id": 1,
          "name": "eMAXIS Slim 全世界株式",
          "allocated_amount_yen": 35000
        }
      ]
    },
    "trend_subject_options": {
      "summary": [
        { "subject_type": "total_assets", "label": "総資産" },
        { "subject_type": "income", "label": "収入" },
        { "subject_type": "expense", "label": "支出" }
      ],
      "assets": [
        { "subject_type": "asset", "subject_id": 1, "label": "住信SBIネット銀行" }
      ],
      "investment_targets": [
        { "subject_type": "investment_target", "subject_id": 1, "label": "eMAXIS Slim 全世界株式" }
      ],
      "historical": [
        { "subject_type": "asset", "subject_id": 99, "label": "旧口座 (履歴)" }
      ]
    }
  },
  "meta": {}
}
```
- **補足**:
  - 表示基準月は常に最新の確定済み月とする。
  - 確定済み月が存在しない場合は、主要カードを空状態用データで返す。
  - `kpis.total_assets_yen` は `asset_summary.regular_assets_total_yen + investment_composition.total_valuation_yen` を表す。
  - `investment_decision.emergency_fund_yen` は投資判断に使用した生活防衛資金の適用値を表す。
  - 投資構成は最新確定月の投資評価額構成比を返す。
  - 採用イベントは `年月 + 内容` のみ返す。

### 3.2 `GET /dashboard/trend`
- **説明**: 折れ線グラフ用の時系列データを取得する。
- **クエリパラメータ**:
  - `subject_type`: `total_assets` | `income` | `expense` | `asset` | `investment_target`
  - `subject_id`: `asset` / `investment_target` の場合必須
  - `period`: `3m` | `6m` | `12m` | `all`
- **レスポンス例** (`200`):
```json
{
  "data": {
    "subject": {
      "subject_type": "total_assets",
      "subject_id": null,
      "label": "総資産"
    },
    "period": "6m",
    "points": [
      { "month": "2025-11", "value_yen": 2800000 },
      { "month": "2025-12", "value_yen": 2910000 },
      { "month": "2026-01", "value_yen": 3040000 }
    ]
  },
  "meta": {}
}
```
- **補足**:
  - 確定済み月のみ返す。
  - 収入、支出は正の値で返す。
  - 対象データが存在しない場合も自動で別対象に切り替えず、空の `points` を返す。

## 4. 月次記録API
### 4.1 `GET /monthly-records`
- **説明**: 管理中の月一覧と初期表示情報を取得する。
- **レスポンス例** (`200`):
```json
{
  "data": {
    "months": [
      { "month": "2026-03", "confirmed": true },
      { "month": "2026-04", "confirmed": false }
    ],
    "initial_month": "2026-04",
    "first_unconfirmed_month": "2026-04"
  },
  "meta": {}
}
```

### 4.2 `GET /monthly-records/{month}`
- **説明**: 対象月の月次記録画面表示に必要なデータを取得する。
- **パスパラメータ**:
  - `month`: `YYYY-MM`
- **レスポンス例** (`200`):
```json
{
  "data": {
    "month": "2026-04",
    "confirmed": false,
    "resolved_expense_yen": null,
    "expense_estimate_yen": 255000,
    "can_confirm": false,
    "confirm_error_code": "VALIDATION_ERROR",
    "confirm_error": "資産に未入力があります。",
    "confirm_error_details": {
      "categories": ["assets"]
    },
    "assets": [
      {
        "asset_id": 1,
        "name": "住信SBIネット銀行",
        "value_yen": 1200000
      }
    ],
    "deleted_assets": [
      {
        "asset_id": 9,
        "name": "旧証券口座"
      }
    ],
    "incomes": [
      {
        "income_id": 1,
        "name": "給与",
        "value_yen": 350000
      }
    ],
    "investment_valuations": [
      {
        "investment_target_id": 1,
        "name": "eMAXIS Slim 全世界株式",
        "value_yen": 753750
      }
    ]
  },
  "meta": {}
}
```
- **補足**:
  - 一覧順は登録順とする。
  - 確定済み月では閲覧専用表示用データとして返す。
  - 資産/収入0件時は空状態用データを返す。
  - 投資先0件時は説明のみの空状態用データを返す。

### 4.3 `POST /monthly-records/{month}/assets`
- **説明**: 資産を追加する。
- **リクエスト**:
```json
{
  "name": "住信SBIネット銀行"
}
```
- **レスポンス例** (`201`):
```json
{
  "data": {
    "asset_id": 1,
    "name": "住信SBIネット銀行"
  },
  "meta": {
    "message": "資産を追加しました。"
  }
}
```
- **主要エラー**:
  - `409 DUPLICATE_NAME`: 同一ユーザー内の資産名重複
  - `403 FORBIDDEN`: 確定済み月

### 4.4 `PATCH /monthly-records/{month}/assets/{asset_id}`
- **説明**: 資産名または当月評価額を更新する。
- **リクエスト**:
```json
{
  "name": "住信SBIネット銀行",
  "value_yen": 1250000
}
```
- **補足**:
  - `value_yen` は負値を許容する。
  - 名称変更は選択月から将来へ反映する。
  - 即保存APIとして扱う。
- **レスポンス例** (`200`):
```json
{
  "data": {
    "asset_id": 1,
    "name": "住信SBIネット銀行",
    "value_yen": 1250000
  },
  "meta": {
    "message": "資産を更新しました。"
  }
}
```

### 4.5 `DELETE /monthly-records/{month}/assets/{asset_id}`
- **説明**: 資産を削除し、次の未確定月から非表示にする。
- **レスポンス例** (`200`):
```json
{
  "data": {
    "deleted": true,
    "effective_from_month": "2026-05"
  },
  "meta": {
    "message": "資産を削除しました。"
  }
}
```

### 4.6 `POST /monthly-records/{month}/assets/{asset_id}/restore`
- **説明**: 削除済み資産を最新確定月の次の未確定月から再表示する。
- **レスポンス例** (`200`):
```json
{
  "data": {
    "restored": true,
    "effective_from_month": "2026-05"
  },
  "meta": {
    "message": "資産を復活しました。"
  }
}
```

### 4.7 `POST /monthly-records/{month}/incomes`
- **説明**: 収入明細を追加する。
- **リクエスト**:
```json
{
  "name": "給与"
}
```
- **レスポンス例** (`201`):
```json
{
  "data": {
    "income_id": 1,
    "name": "給与"
  },
  "meta": {
    "message": "収入明細を追加しました。"
  }
}
```
- **主要エラー**:
  - `409 DUPLICATE_NAME`: 同一ユーザー内の収入名重複

### 4.8 `PATCH /monthly-records/{month}/incomes/{income_id}`
- **説明**: 収入名または当月金額を更新する。
- **リクエスト**:
```json
{
  "name": "給与",
  "value_yen": 350000
}
```
- **補足**:
  - 名称変更は選択月から将来へ反映する。
  - `value_yen` は0以上とする。
- **レスポンス例** (`200`):
```json
{
  "data": {
    "income_id": 1,
    "name": "給与",
    "value_yen": 350000
  },
  "meta": {
    "message": "収入明細を更新しました。"
  }
}
```

### 4.9 `DELETE /monthly-records/{month}/incomes/{income_id}`
- **説明**: 収入明細を削除し、選択月から将来へ非表示にする。
- **レスポンス例** (`200`):
```json
{
  "data": {
    "deleted": true,
    "effective_from_month": "2026-04"
  },
  "meta": {
    "message": "収入明細を削除しました。"
  }
}
```

### 4.10 `PUT /monthly-records/{month}/investment-valuations/{investment_target_id}`
- **説明**: 設定済み投資先の当月評価額を更新する。
- **リクエスト**:
```json
{
  "value_yen": 753750
}
```
- **補足**:
  - `value_yen` は0以上とする。
  - 投資先未設定の場合、本APIは呼ばれない想定とする。
- **レスポンス例** (`200`):
```json
{
  "data": {
    "investment_target_id": 1,
    "name": "eMAXIS Slim 全世界株式",
    "value_yen": 753750
  },
  "meta": {
    "message": "投資評価額を更新しました。"
  }
}
```

### 4.11 `POST /monthly-records/{month}/confirm`
- **説明**: 支出補正後の値で対象月を確定する。
- **リクエスト**:
```json
{
  "expense_override_yen": 255000
}
```
- **補足**:
  - `expense_override_yen` は、推定値をそのまま採用する場合も明示送信してよい。
  - 初月など推定不可の月は、補正値を必須とする。
  - 確定後は対象月をロックし、次月レコードを準備する。
- **主要エラー**:
  - `409 MONTH_NOT_CONFIRMABLE`: 古い未確定月がある
  - `409 VALIDATION_ERROR`: 資産/収入/投資評価額に未入力あり
  - `403 FORBIDDEN`: 既に確定済み
- **エラー例** (`409 VALIDATION_ERROR`):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "未入力の項目があります。",
    "details": {
      "categories": ["assets", "investment_valuations"]
    }
  }
}
```
- **エラー例** (`409 MONTH_NOT_CONFIRMABLE`):
```json
{
  "error": {
    "code": "MONTH_NOT_CONFIRMABLE",
    "message": "先に古い未確定月を確定してください。",
    "details": {
      "first_unconfirmed_month": "2026-03"
    }
  }
}
```

## 5. ライフプランAPI
### 5.1 `GET /life-plans`
- **説明**: ライフプラン一覧を取得する。
- **レスポンス例** (`200`):
```json
{
  "data": [
    {
      "life_plan_id": 1,
      "month": "2027-01",
      "title": "引っ越し費用",
      "amount_yen": 500000,
      "note": "敷金・礼金込み"
    }
  ],
  "meta": {}
}
```
- **補足**:
  - 近い年月順で返す。

### 5.2 `POST /life-plans`
- **説明**: ライフプランイベントを追加する。
- **リクエスト**:
```json
{
  "month": "2027-01",
  "title": "引っ越し費用",
  "amount_yen": 500000,
  "note": "敷金・礼金込み"
}
```
- **レスポンス例** (`201`):
```json
{
  "data": {
    "life_plan_id": 1,
    "month": "2027-01",
    "title": "引っ越し費用",
    "amount_yen": 500000,
    "note": "敷金・礼金込み"
  },
  "meta": {
    "message": "ライフプランを追加しました。"
  }
}
```

### 5.3 `PATCH /life-plans/{life_plan_id}`
- **説明**: ライフプランイベントを更新する。
- **リクエスト**:
```json
{
  "month": "2027-01",
  "title": "引っ越し費用",
  "amount_yen": 550000,
  "note": "初期費用込み"
}
```
- **レスポンス例** (`200`):
```json
{
  "data": {
    "life_plan_id": 1,
    "month": "2027-01",
    "title": "引っ越し費用",
    "amount_yen": 550000,
    "note": "初期費用込み"
  },
  "meta": {
    "message": "ライフプランを更新しました。"
  }
}
```

### 5.4 `DELETE /life-plans/{life_plan_id}`
- **説明**: ライフプランイベントを削除する。
- **レスポンス例** (`200`):
```json
{
  "data": {
    "deleted": true
  },
  "meta": {
    "message": "ライフプランを削除しました。"
  }
}
```

## 6. 設定API
### 6.1 `GET /settings`
- **説明**: 設定画面表示に必要な現在設定と予測サマリーを取得する。
- **レスポンス例** (`200`):
```json
{
  "data": {
    "effective_from_month": "2026-05",
    "emergency_fund_yen": 1000000,
    "investment_target_allocations": [
      {
        "investment_target_id": 1,
        "name": "eMAXIS Slim 全世界株式",
        "ratio_percent": 50.0
      }
    ],
    "forecast": {
      "monthly_income_yen": 410000,
      "monthly_expense_yen": 255000,
      "sample_months": 6,
      "rule": "確定済み直近6か月平均"
    }
  },
  "meta": {}
}
```

### 6.2 `PATCH /settings/emergency-fund`
- **説明**: 生活防衛資金を更新する。
- **リクエスト**:
```json
{
  "emergency_fund_yen": 1000000
}
```
- **レスポンス例** (`200`):
```json
{
  "data": {
    "effective_from_month": "2026-05",
    "emergency_fund_yen": 1000000
  },
  "meta": {
    "message": "生活防衛資金を保存しました。"
  }
}
```
- **補足**:
  - 反映開始月は次の未確定月とする。
  - `emergency_fund_yen` は0以上とする。

### 6.3 `PUT /settings/investment-target-allocations`
- **説明**: 投資先一覧と配分比率を一括更新する。
- **リクエスト**:
```json
{
  "targets": [
    {
      "name": "eMAXIS Slim 全世界株式",
      "ratio_percent": 50.0
    },
    {
      "name": "eMAXIS Slim 米国株式(S&P500)",
      "ratio_percent": 30.0
    },
    {
      "name": "たわらノーロード 先進国債券",
      "ratio_percent": 20.0
    }
  ]
}
```
- **バリデーション**:
  - 名前重複不可
  - `ratio_percent` は小数第2位まで
  - 合計100.00%必須
- **レスポンス例** (`200`):
```json
{
  "data": {
    "effective_from_month": "2026-05",
    "targets": [
      {
        "investment_target_id": 1,
        "name": "eMAXIS Slim 全世界株式",
        "ratio_percent": 50.0
      }
    ]
  },
  "meta": {
    "message": "投資先配分を保存しました。"
  }
}
```
- **補足**:
  - 追加・編集・削除を1回の保存で反映する。
  - 反映開始月は次の未確定月とする。

## 7. 備考
- 月次記録の更新系APIは、すべて画面の即保存操作を前提とする。
- 投資計算結果はDB保存せず、確定済み入力と設定から毎回再計算する。
- ダッシュボードは `GET /dashboard` と `GET /dashboard/trend` を分離し、上段カード群と折れ線グラフの取得を分ける。
- 現行 backend 実装との細部差異は、今後本仕様へ寄せて実装更新する前提とする。

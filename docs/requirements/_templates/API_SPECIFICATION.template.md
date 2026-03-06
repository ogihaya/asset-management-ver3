# API仕様書

## 1. 共通仕様
### 1.1 ベースURL
### 1.2 認証方式
### 1.3 共通ヘッダー
### 1.4 エラーレスポンス形式
```json
{
  "detail": "エラーメッセージ"
}
```
### 1.5 ページネーション
### 1.6 ステータスコード一覧
| コード | 意味 | 使用場面 |
|---|---|---|

## 2. 認証API
### POST /api/auth/login
### POST /api/auth/logout
### GET /api/auth/status

## 3. [リソース名] API
### GET /api/[resource]
- **説明**:
- **クエリパラメータ**:
- **レスポンス**:
### POST /api/[resource]
### GET /api/[resource]/{id}
### PUT /api/[resource]/{id}
### DELETE /api/[resource]/{id}

## 4. ダッシュボードAPI
<!-- 集計・分析系のAPI -->

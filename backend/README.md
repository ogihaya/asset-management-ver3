# Backend

FastAPI + Python 3.11+ で構築されたエンタープライズグレードのバックエンドAPIです。

**オニオンアーキテクチャ**を採用し、ビジネスロジックとインフラストラクチャを明確に分離しています。

## 📚 ドキュメント

詳細なドキュメントは [`../docs/rules`](../docs/rules) を参照してください。

### アーキテクチャ
- **[アーキテクチャ設計](../docs/rules/architecture/BACKEND.md)** - オニオンアーキテクチャ、レイヤー構成、依存関係ルール

### 開発ガイド
- **[開発ガイド](../docs/rules/development/BACKEND.md)** - 今後の開発の流れ、実装済み機能

---

## ⚡ クイックスタート

### 🔧 前提条件

- **Python 3.11+**
- **Docker Desktop**（推奨）
- **PostgreSQL 15**

### 🚀 セットアップ

#### 方法1: Docker Compose を使用（推奨）

```bash
# プロジェクトルートで実行
cd ..
make up

# または
docker compose up -d
```

**起動後のアクセス:**
- バックエンドAPI: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- pgAdmin: http://localhost:5050

#### 方法2: ローカル環境で実行

```bash
# 1. 仮想環境の作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. 依存関係のインストール
pip install -r requirements.txt

# 3. 環境変数の設定
cp .env.example .env

# 4. データベースマイグレーション
alembic upgrade head

# 5. 開発サーバーの起動
uvicorn app.main:app --reload
```

詳細は **[開発ガイド](../docs/rules/development/BACKEND.md)** を参照してください。

---

## 💻 開発コマンド

### Makeコマンド（推奨）

| コマンド | 説明 |
|---|---|
| `make lint-all` | Lintチェック（ruff + black + mypy） |
| `make onion-check` | オニオンアーキテクチャチェック |
| `make format` | コードフォーマット |
| `make test` | テスト実行 |

### 直接実行

```bash
# Lintチェック
ruff check app/
black --check app/
mypy app/

# フォーマット
ruff check --fix app/
black app/

# テスト
pytest
```

---

## 🏗️ 技術スタック

### コアフレームワーク
- **FastAPI** - 高速なWebフレームワーク
- **Python 3.11+** - 最新のPython機能を活用

### データベース
- **PostgreSQL 15** - リレーショナルデータベース
- **SQLAlchemy** - ORM
- **Alembic** - マイグレーション管理

### 認証
- **JWT (RS256)** - Cookie-based認証
- **PassLib** - パスワードハッシュ化

### 開発ツール
- **Ruff** - 高速Linter
- **Black** - コードフォーマッター
- **MyPy** - 型チェッカー
- **Pytest** - テストフレームワーク

詳細は **[アーキテクチャ設計](../docs/rules/architecture/BACKEND.md)** を参照してください。

---

## 📁 プロジェクト構造

このプロジェクトは **オニオンアーキテクチャ**を採用しています。

```
backend/app/
├── domain/              # Domain層（エンティティ、リポジトリIF）
├── application/         # Application層（ユースケース、DTO）
├── infrastructure/      # Infrastructure層（DB実装、外部サービス）
├── presentation/        # Presentation層（APIエンドポイント）
└── di/                  # DI層（依存性注入）
```

**依存関係ルール**: 外側の層→内側の層のみimport可能

詳細は **[アーキテクチャ設計](../docs/rules/architecture/BACKEND.md)** を参照してください。

---

## 📖 関連ドキュメント

詳細は [`../docs/rules`](../docs/rules) を参照してください。

- **[アーキテクチャ](../docs/rules/architecture/BACKEND.md)** - システム設計
- **[開発ガイド](../docs/rules/development/BACKEND.md)** - 実装方法
- **[API仕様](http://localhost:8000/docs)** - Swagger UI

---

**最終更新**: 2025-11-21
**バージョン**: 1.0.0

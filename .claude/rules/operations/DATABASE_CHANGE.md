# データベース変更ガイド

## 目次

- [データベース変更ガイド](#データベース変更ガイド)
  - [目次](#目次)
  - [はじめに](#はじめに)
    - [サポートされている DB](#サポートされているdb)
  - [現在の DB 構成](#現在のdb構成)
    - [関連ファイル一覧](#関連ファイル一覧)
    - [現在の設定](#現在の設定)
  - [DB 変更手順](#db変更手順)
    - [3.1 環境変数の変更](#31-環境変数の変更)
    - [3.2 Docker Compose の変更](#32-docker-composeの変更)
      - [PostgreSQL（デフォルト）](#postgresqlデフォルト)
      - [MySQL](#mysql)
      - [SQLite](#sqlite)
    - [3.3 ドライバのインストール](#33-ドライバのインストール)
    - [3.4 マイグレーションの再生成](#34-マイグレーションの再生成)
  - [DB 別の設定例](#db別の設定例)
    - [4.1 MySQL](#41-mysql)
      - [Step 1: 環境変数を変更](#step-1-環境変数を変更)
      - [Step 2: Docker Compose を変更](#step-2-docker-composeを変更)
      - [Step 3: ドライバを追加](#step-3-ドライバを追加)
      - [Step 4: config.py を更新（オプション）](#step-4-configpyを更新オプション)
  - [注意事項](#注意事項)
    - [DB 固有の機能について](#db固有の機能について)
    - [本番環境での考慮事項](#本番環境での考慮事項)
  - [チェックリスト](#チェックリスト)

---

## はじめに

このテンプレートは **PostgreSQL 15** をデフォルトのデータベースとして使用しています。SQLAlchemy + Alembic を採用しているため、SQLAlchemy がサポートするデータベースであれば比較的容易に変更可能です。

### サポートされている DB

| データベース | サポート状況 | 推奨用途         |
| ------------ | ------------ | ---------------- |
| PostgreSQL   | デフォルト   | 本番環境         |
| MySQL        | サポート     | 本番環境         |
| SQLite       | サポート     | 開発・テスト     |
| SQL Server   | サポート     | エンタープライズ |
| Oracle       | サポート     | エンタープライズ |

---

## 現在の DB 構成

### 関連ファイル一覧

| ファイルパス               | 説明                                  |
| -------------------------- | ------------------------------------- |
| `backend/.env`             | DB 接続設定（環境変数）               |
| `backend/app/config.py`    | 環境変数管理（Pydantic Settings）     |
| `backend/requirements.txt` | DB ドライバ（psycopg2-binary 等）     |
| `docker-compose.yml`       | PostgreSQL コンテナ定義               |
| `backend/alembic/env.py`   | Alembic 設定（DATABASE_URL 読み込み） |
| `backend/alembic.ini`      | Alembic 設定ファイル                  |

### 現在の設定

**backend/.env**

```bash
POSTGRES_USER=app_user
POSTGRES_PASSWORD=app_password
POSTGRES_DB=ai_solution_db
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql+psycopg2://app_user:app_password@db:5432/ai_solution_db
```

---

## DB 変更手順

### 3.1 環境変数の変更

**ファイル**: `backend/.env`

`DATABASE_URL` を変更先の DB に合わせて修正します。

```bash
# PostgreSQL（デフォルト）
DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/dbname

# MySQL
DATABASE_URL=mysql+pymysql://user:pass@host:3306/dbname

# SQLite
DATABASE_URL=sqlite:///./app.db

# SQL Server
DATABASE_URL=mssql+pyodbc://user:pass@host:1433/dbname?driver=ODBC+Driver+17+for+SQL+Server
```

### 3.2 Docker Compose の変更

**ファイル**: `docker-compose.yml`

db サービスのイメージと環境変数を変更します。

#### PostgreSQL（デフォルト）

```yaml
db:
  image: postgres:15
  container_name: postgres_container_ai_solution
  env_file: ./backend/.env
  ports:
    - "5432:5432"
  volumes:
    - ./db_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
    interval: 5s
    timeout: 5s
    retries: 5
```

#### MySQL

```yaml
db:
  image: mysql:8.0
  container_name: mysql_container_ai_solution
  environment:
    MYSQL_ROOT_PASSWORD: root_password
    MYSQL_DATABASE: ai_solution_db
    MYSQL_USER: app_user
    MYSQL_PASSWORD: app_password
  ports:
    - "3306:3306"
  volumes:
    - ./db_data:/var/lib/mysql
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
    interval: 5s
    timeout: 5s
    retries: 5
```

#### SQLite

SQLite を使用する場合、db サービスは不要です。コメントアウトまたは削除してください。

```yaml
# db:
#   image: postgres:15
#   ...
```

### 3.3 ドライバのインストール

**ファイル**: `backend/requirements.txt`

使用する DB に対応するドライバを追加します。

| データベース | ドライバ       | requirements.txt  |
| ------------ | -------------- | ----------------- |
| PostgreSQL   | psycopg2       | `psycopg2-binary` |
| MySQL        | PyMySQL        | `pymysql`         |
| MySQL        | mysqlclient    | `mysqlclient`     |
| SQLite       | 標準ライブラリ | 不要              |
| SQL Server   | pyodbc         | `pyodbc`          |

**例: MySQL に変更する場合**

```diff
- psycopg2-binary
+ pymysql
```

### 3.4 マイグレーションの再生成

DB を変更した場合、既存のマイグレーションファイルには DB 固有の SQL 構文が含まれている可能性があるため、再生成が必要になることがあります。

```bash
# 既存のマイグレーションを削除（必要に応じて）
rm -rf backend/alembic/versions/*.py

# 新しいDBでマイグレーションを作成
make db-init
```

**注意**: 本番環境のデータがある場合は、データ移行計画を立ててから実行してください。

---

## DB 別の設定例

### 4.1 MySQL

#### Step 1: 環境変数を変更

**backend/.env**

```bash
# MySQL接続設定
MYSQL_USER=app_user
MYSQL_PASSWORD=app_password
MYSQL_DATABASE=ai_solution_db
MYSQL_HOST=db
MYSQL_PORT=3306

DATABASE_URL=mysql+pymysql://app_user:app_password@db:3306/ai_solution_db
```

#### Step 2: Docker Compose を変更

**docker-compose.yml**

```yaml
services:
  db:
    image: mysql:8.0
    container_name: mysql_container_ai_solution
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: ai_solution_db
      MYSQL_USER: app_user
      MYSQL_PASSWORD: app_password
    ports:
      - "3306:3306"
    volumes:
      - ./db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 5

  # pgadminは不要なので削除またはコメントアウト
  # pgadmin:
  #   ...
```

#### Step 3: ドライバを追加

**backend/requirements.txt**

```diff
- psycopg2-binary
+ pymysql
```

#### Step 4: config.py を更新（オプション）

変数名を MySQL 用に変更する場合：

**backend/app/config.py**

```python
class Settings(BaseSettings):
    mysql_user: str = "app_user"
    mysql_password: str = "app_password"
    mysql_database: str = "ai_solution_db"
    mysql_host: str = "db"
    mysql_port: int = 3306
    database_url: str = ""

    model_config = SettingsConfigDict(env_file=".env")
```

---

## 注意事項

### DB 固有の機能について

SQLAlchemy は多くの DB で共通のコードを使用できますが、以下の点に注意してください：

1. **データ型の違い**

   - PostgreSQL の`ARRAY`型、`JSONB`型などは MySQL/SQLite では使用できません
   - 必要に応じて`JSON`型や別のアプローチに変更してください

2. **自動インクリメント**

   - PostgreSQL: `SERIAL` / `BIGSERIAL`
   - MySQL: `AUTO_INCREMENT`
   - SQLite: `INTEGER PRIMARY KEY`
   - SQLAlchemy が自動的に対応しますが、既存のマイグレーションは再生成が必要な場合があります

3. **文字列長の制限**

   - MySQL では`VARCHAR`のデフォルト長に制限があります
   - `String(255)`のように明示的に長さを指定してください

4. **トランザクション分離レベル**
   - DB によってデフォルトの分離レベルが異なります
   - 必要に応じて SQLAlchemy の設定で明示的に指定してください

### 本番環境での考慮事項

1. **データ移行**

   - 既存データがある場合は、適切な移行計画を立ててください
   - pg_dump / mysqldump などを使用してデータをエクスポート/インポート

2. **接続プール**

   - 本番環境では接続プールの設定を調整してください
   - SQLAlchemy の`pool_size`、`max_overflow`などを適切に設定

3. **SSL 接続**
   - 本番環境では SSL 接続を有効にしてください
   - DATABASE_URL に`?sslmode=require`などを追加

---

## チェックリスト

DB 変更完了チェックリスト

- [ ] `backend/.env` の `DATABASE_URL` を変更
- [ ] `docker-compose.yml` の db サービスを変更
- [ ] `backend/requirements.txt` に適切なドライバを追加
- [ ] `backend/app/config.py` の設定項目名を変更（オプション）
- [ ] 既存のマイグレーションを確認・再生成
- [ ] `docker compose up -d` で起動確認
- [ ] `make db-upgrade` でマイグレーション適用確認
- [ ] アプリケーションの動作確認
- [ ] pgadmin の削除または DB 管理ツールの変更

---

**最終更新**: 2025-12-19
**バージョン**: 1.0.0

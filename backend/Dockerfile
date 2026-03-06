FROM python:3.11-slim

WORKDIR /app

# 依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY ./app ./app
COPY ./tests ./tests
COPY pytest.ini .

# Alembic（マイグレーション）のコピー
COPY ./alembic ./alembic
COPY ./alembic.ini ./alembic.ini

# ポート公開
EXPOSE 8000

# デフォルトコマンド（アプリケーション起動）
# マイグレーションは別タスクで実行: ["alembic", "upgrade", "head"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
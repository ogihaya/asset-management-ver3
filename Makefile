.PHONY: help up down build logs test lint format db-migrate db-upgrade onion-check generate-rsa-keys

help:
	@echo "Docker:"
	@echo "  make up        - 起動"
	@echo "  make down      - 停止"
	@echo "  make build     - ビルド"
	@echo "  make logs      - ログ表示"
	@echo ""
	@echo "開発:"
	@echo "  make test        - テスト実行"
	@echo "  make lint        - Lint（Backend + Frontend）"
	@echo "  make format      - Format（Backend + Frontend）"
	@echo "  make onion-check - Onion Architecture依存関係チェック"
	@echo ""
	@echo "DB:"
	@echo "  make db-migrate msg='message' - マイグレーション作成"
	@echo "  make db-upgrade               - マイグレーション適用"
	@echo ""
	@echo "セキュリティ:"
	@echo "  make generate-rsa-keys - JWT用RSA鍵ペア生成"

# Docker
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

# 開発
test:
	docker compose exec backend pytest -v

lint:
	@echo "=== Backend Lint ==="
	docker compose exec backend ruff check --fix .
	@echo ""
	@echo "=== Frontend Lint ==="
	cd frontend && npm run lint

format:
	@echo "=== Backend Format ==="
	docker compose exec backend ruff format .
	@echo ""
	@echo "=== Frontend Format ==="
	cd frontend && npm run format

onion-check:
	docker compose run --rm backend python scripts/check_onion_architecture.py

# DB
db-migrate:
	@if [ -z "$(msg)" ]; then echo "Usage: make db-migrate msg='message'"; exit 1; fi
	docker compose run --rm migrator alembic revision --autogenerate -m "$(msg)"

db-upgrade:
	docker compose run --rm migrator alembic upgrade head

# セキュリティ
generate-rsa-keys:
	docker compose exec backend python scripts/generate_rsa_keys.py

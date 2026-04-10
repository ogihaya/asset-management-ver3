.PHONY: help up down build logs test lint format db-migrate db-upgrade onion-check generate-rsa-keys

COMPOSE_PROJECT_NAME ?= asset-management-ver3
DOCKER_COMPOSE = COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) docker compose

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
	$(DOCKER_COMPOSE) up -d

down:
	$(DOCKER_COMPOSE) down

build:
	$(DOCKER_COMPOSE) build

logs:
	$(DOCKER_COMPOSE) logs -f

# 開発
test:
	$(DOCKER_COMPOSE) exec backend pytest -v

lint:
	@echo "=== Backend Lint ==="
	$(DOCKER_COMPOSE) exec backend ruff check --fix .
	@echo ""
	@echo "=== Frontend Lint ==="
	cd frontend && npm run lint

format:
	@echo "=== Backend Format ==="
	$(DOCKER_COMPOSE) exec backend ruff format .
	@echo ""
	@echo "=== Frontend Format ==="
	cd frontend && npm run format

onion-check:
	$(DOCKER_COMPOSE) run --rm backend python scripts/check_onion_architecture.py

# DB
db-migrate:
	@if [ -z "$(msg)" ]; then echo "Usage: make db-migrate msg='message'"; exit 1; fi
	$(DOCKER_COMPOSE) run --rm migrator alembic revision --autogenerate -m "$(msg)"

db-upgrade:
	$(DOCKER_COMPOSE) run --rm migrator alembic upgrade head

# セキュリティ
generate-rsa-keys:
	$(DOCKER_COMPOSE) exec backend python scripts/generate_rsa_keys.py

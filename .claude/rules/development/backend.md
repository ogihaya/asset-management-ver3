---
paths: backend/**
---
# Backend Development Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Database](#database)
3. [API](#api)
4. [Implemented Features](#implemented-features)

---

## Getting Started

This guide explains practical development methods using the AI Solution Template.

### Prerequisites

- Understanding of DDD-based onion architecture from the Backend Architecture Guide
- Basic knowledge of Python, Postgres (MySQL)
- DB design and API design completed for the development project

---

## Database

After completing the DB design, write the code in the backend.

### Steps

1. Write the necessary tables in `app/infrastructure/db/models/`.
   - Refer to the commented examples.
   - Fine-grained settings like indexes can be added later as needed for performance improvements.
2. Create `app/infrastructure/db/models/__init__.py` and import all models defined in step 1.
3. Import all models in `backend/alembic/env.py` after line 29.
   - This allows alembic to automatically detect differences.
4. Reflect these definitions in the actual DB (production or local).

- **Local environment** (running DB on Docker):

  1. Use the make command to detect differences and create migration files:
     ```bash
     make db-migrate msg='hogehoge message'
     ```
  2. Always visually verify the created migration file (manual corrections are often needed!).
  3. Execute the migration:
     ```bash
     make db-upgrade
     ```
  - **For team members other than the migration creator**: The `migrator` service in docker-compose.yml automatically runs the equivalent of `make db-upgrade` on Docker startup, keeping migration history in sync.

- **Production environment** (AWS, etc.):
  - In addition to the local steps, ensure the DB connection target is properly updated to the production environment in the auto-deploy workflow.
  - Note: DB specs in deployment may cause extremely slow I/O compared to local, so watch out for N+1 problems during migrations.

---

## API

- After completing the API design, implement according to the Backend Architecture Guide
- Endpoints like `POST /login` are already implemented. Contact the team for more implementation examples.

### API Documentation

- On push (merge) to the main branch, if there are changes in `app/presentation/`, API documentation is automatically generated with Swagger UI.
- Implementation: `.github/workflows/update-swagger.yml`
- Output location: `backend/documents/api/`

---

## Implemented Features

### 1. Directory Structure

- The onion architecture directory structure is pre-created
- Start development following this structure

### 2. Login Feature

- 3 APIs implemented:
  - POST /api/auth/login
    - Login with `login_id = admin`, `password = pass`
    - `access_token` is generated using RSA encryption
    - Modify the User schema in `backend/app/infrastructure/security/security_service_impl.py` to the appropriate location and fields. Also change the token contents as needed.
    - Generated token is set in a cookie by the backend
  - POST /api/auth/logout
    - Standard logout function that deletes the cookie
  - GET /api/auth/status
    - If `current_user` is obtained via dependency injection, authentication is complete

### 3. Alembic Setup

- Initial setup is complete, though no migration files have been created yet
- Use `make db-migrate msg='hoge'` to create migration files and reflect them in the DB
- In team development, concurrent migration file creation can cause revision conflicts
  - While merging can resolve this, it's better to communicate within the team and keep the version history linear

### 4. Build Check & Format Check CI/CD

- By default, build and format check CI runs when creating a PR to the main branch (`.github/workflows/backend-ci.yml`)
- Recommend running make commands locally before creating PRs to verify CI will pass
- Adjust Ruff settings as needed for the project

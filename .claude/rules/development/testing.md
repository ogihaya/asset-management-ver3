---
description: Testing guide for all layers - frontend, backend, and infrastructure
---
# Testing Guide

## Table of Contents

1. [Overview](#overview)
2. [Frontend Testing](#frontend-testing)
3. [Backend Testing](#backend-testing)
4. [Infrastructure Testing](#infrastructure-testing)
5. [CI/CD Testing](#cicd-testing)

---

## Overview

This project has independent test environments for frontend, backend, and infrastructure.

| Target | Framework | Language |
| --- | --- | --- |
| Frontend | Jest | TypeScript |
| Backend | pytest | Python |
| Infrastructure | Jest + CDK assertions | TypeScript |

---

## Frontend Testing

### Test Environment

| Tool | Purpose |
| --- | --- |
| **Jest** | Test framework |
| **React Testing Library** | Component testing |
| **@testing-library/jest-dom** | DOM assertion extensions |

### Running Tests

```bash
cd frontend

# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage

# Specific file
npm test -- date.test.ts

# CI mode (GitHub Actions)
npm test -- --ci
```

### Test File Location

```
frontend/src/
├── shared/
│   └── utils/
│       └── format/
│           ├── date.ts
│           └── __test__/
│               └── date.test.ts    # Unit test
├── entities/
│   └── [domain]/
│       └── api/
│           └── __tests__/
│               └── [domain]-api.test.ts
└── features/
    └── [feature]/
        └── __tests__/
            └── [feature].test.tsx
```

### Unit Test Example

```typescript
// shared/utils/format/__test__/date.test.ts
import { formatDate } from "../date";

describe("formatDate", () => {
  it("formats date string to yy/MM/dd", () => {
    expect(formatDate("2024-03-15")).toBe("24/03/15");
  });

  it('returns "-" for null', () => {
    expect(formatDate(null)).toBe("-");
  });

  it('returns "-" for invalid date', () => {
    expect(formatDate("invalid-date")).toBe("-");
  });
});
```

### Test Structure (AAA Pattern)

```typescript
describe("Feature group name", () => {
  it("describes expected behavior", () => {
    // Arrange
    const input = "2024-03-15";

    // Act
    const result = formatDate(input);

    // Assert
    expect(result).toBe("24/03/15");
  });
});
```

### Test Cases to Cover

- Normal cases (expected input)
- Error cases (null, undefined, empty string)
- Edge cases (boundary values)

---

## Backend Testing

### Test Environment

| Tool | Purpose |
| --- | --- |
| **pytest** | Test framework |
| **pytest-cov** | Coverage measurement |
| **FastAPI TestClient** | API endpoint testing |
| **SQLAlchemy** | DB testing (SQLite in-memory) |

### Running Tests

```bash
cd backend

# Run all tests
pytest

# Verbose output
pytest -v

# With coverage
pytest --cov=app --cov-report=html

# Specific file/directory
pytest tests/presentation/
pytest tests/domain/test_user_entity.py

# Specific test class/method
pytest tests/presentation/test_auth_api.py::TestAuthAPI::test_login_success
```

### Test File Location (Clean Architecture)

```
backend/tests/
├── conftest.py                    # Common fixtures
├── domain/                        # Domain layer tests
│   ├── test_user_entity.py
│   └── test_user_repository_interface.py
├── application/                   # Application layer tests
│   └── test_auth_usecase.py
├── infrastructure/                # Infrastructure layer tests
│   ├── test_user_repository_impl.py
│   └── test_security_service_impl.py
└── presentation/                  # Presentation layer tests
    └── test_auth_api.py
```

### Layer-specific Test Patterns

#### 1. Domain Layer (Entities)

```python
# tests/domain/test_user_entity.py
import pytest
from pydantic import ValidationError
from app.domain.entities.user import User

class TestUserEntity:
    def test_create_user_with_all_fields(self):
        """Create User with all fields"""
        user = User(
            id=1,
            login_id='test_user',
            password='hashed_password',
            email='test@example.com',
            name='Test User',
        )
        assert user.id == 1
        assert user.login_id == 'test_user'

    def test_create_user_without_id_raises_error(self):
        """Creating User without ID raises error"""
        with pytest.raises(ValidationError):
            User(login_id='test_user', password='hashed_password')
```

#### 2. Application Layer (Use Cases)

```python
# tests/application/test_auth_usecase.py
import pytest
from fastapi import HTTPException
from app.application.use_cases.auth_usecase import AuthUsecase
from app.application.schemas.auth_schemas import LoginInputDTO

class TestAuthUsecase:
    def test_login_success(self, mock_security_service):
        """Login success test"""
        mock_security_service.create_access_token.return_value = 'test_token'
        usecase = AuthUsecase(security_service=mock_security_service)
        input_dto = LoginInputDTO(login_id='admin', password='pass')

        result = usecase.login(input_dto)

        assert result.access_token == 'test_token'
        mock_security_service.create_access_token.assert_called_once()

    def test_login_failure_wrong_credentials(self, mock_security_service):
        """Login failure test"""
        usecase = AuthUsecase(security_service=mock_security_service)
        input_dto = LoginInputDTO(login_id='wrong', password='wrong')

        with pytest.raises(HTTPException) as exc_info:
            usecase.login(input_dto)

        assert exc_info.value.status_code == 401
```

#### 3. Infrastructure Layer (Repository Implementation)

```python
# tests/infrastructure/test_user_repository_impl.py
from app.infrastructure.db.repositories.user_repository_impl import UserRepositoryImpl

class TestUserRepositoryImpl:
    def test_get_by_login_id_existing_user(self, db_session):
        """Get existing user by login ID"""
        from app.infrastructure.db.models.user_model import UserModel
        user_model = UserModel(login_id='test_user', password='hashed', ...)
        db_session.add(user_model)
        db_session.commit()

        repository = UserRepositoryImpl(session=db_session)
        user = repository.get_by_login_id('test_user')

        assert user is not None
        assert user.login_id == 'test_user'

    def test_get_by_login_id_non_existing_user(self, db_session):
        """Non-existing user returns None"""
        repository = UserRepositoryImpl(session=db_session)
        user = repository.get_by_login_id('non_existing')
        assert user is None
```

#### 4. Presentation Layer (API Endpoints)

```python
# tests/presentation/test_auth_api.py
from fastapi import status
from fastapi.testclient import TestClient

class TestAuthAPI:
    def test_login_success(self, test_client: TestClient):
        """Login success test"""
        response = test_client.post(
            '/auth/login',
            json={'login_id': 'admin', 'password': 'pass'}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'access_token' in data
        assert 'access_token' in response.cookies

    def test_login_failure_wrong_credentials(self, test_client: TestClient):
        """Login failure test"""
        response = test_client.post(
            '/auth/login',
            json={'login_id': 'wrong', 'password': 'wrong'}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_missing_field(self, test_client: TestClient):
        """Validation error test"""
        response = test_client.post(
            '/auth/login',
            json={'password': 'pass'}  # login_id missing
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
```

### Best Practices

1. **Each test is independent**: `db_session` rolls back after each test
2. **Use mocks**: Isolate dependencies with `MagicMock`
3. **Fixture scope**: `session` > `module` > `function`
4. **Disable auth**: `ENABLE_AUTH=false` during testing

---

## Infrastructure Testing

### Test Environment

| Tool | Purpose |
| --- | --- |
| **Jest** | Test framework |
| **CDK assertions** | CloudFormation template verification |
| **aws-cdk-lib** | CDK constructs |

### Running Tests

```bash
cd infra

# Run all tests
npx jest

# Watch mode
npx jest --watch

# Specific file
npx jest foundation-stack.test.ts

# Update snapshots
npx jest --updateSnapshot
```

### Test File Location (4-Layer Architecture)

```
infra/test/
├── test-config.ts                     # Test config
├── construct/                         # Layer 1: Construct tests
│   ├── compute/
│   ├── networking/
│   └── security/
├── resource/                          # Layer 2: Resource tests
│   ├── network-resource.test.ts
│   └── ...
└── stack/                             # Layer 3: Stack tests
    ├── foundation-stack.test.ts
    └── ...
```

### CDK assertions API

| Method | Purpose |
|--------|---------|
| `template.resourceCountIs()` | Verify resource count |
| `template.hasResourceProperties()` | Verify resource properties |
| `template.hasResource()` | Verify resource existence |
| `template.findOutputs()` | Search outputs |
| `template.hasOutput()` | Verify output existence |

### Best Practices

1. **Separate test config**: Use fixed values in `test-config.ts`
2. **Layer-by-layer testing**: Construct -> Resource -> Stack
3. **Resource count verification**: Confirm expected resources with `resourceCountIs()`
4. **Property verification**: Verify important properties like security settings
5. **Snapshot tests**: Detect unintended changes

---

## CI/CD Testing

### Frontend CI

```yaml
# .github/workflows/frontend-ci.yml
- run: npm ci
- run: npm run build
- run: npm test -- --ci
```

### Backend CI

```yaml
# .github/workflows/backend-ci.yml
- run: pip install -r requirements.txt
- run: pytest --cov=app --cov-report=xml
```

### Infrastructure CI

```yaml
# .github/workflows/infra-ci.yml
- run: npm ci
- run: npx jest
```

---

## Coverage Targets

| Target | Goal |
| --- | --- |
| Frontend Shared | 80%+ |
| Backend Domain | 90%+ |
| Backend Application | 80%+ |
| Backend Infrastructure | 70%+ |
| Backend Presentation | 80%+ |
| Infrastructure Stack | 80%+ |
| Infrastructure Resource | 70%+ |

---

## References

### Frontend

- [Jest](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Backend

- [pytest](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

### Infrastructure

- [CDK Testing](https://docs.aws.amazon.com/cdk/v2/guide/testing.html)
- [CDK assertions](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions-readme.html)

---
paths: backend/**
---
# Backend Architecture Guide

## Table of Contents

1. [Onion Architecture Overview](#onion-architecture-overview)
2. [Layer Responsibilities](#layer-responsibilities)
3. [Domain Layer](#domain-layer)
4. [Application Layer](#application-layer)
5. [Infrastructure Layer](#infrastructure-layer)
6. [Presentation Layer](#presentation-layer)
7. [DI Layer](#di-layer)

---

## Onion Architecture Overview

Onion Architecture is a concentric layered architecture centered around the domain.

### Structure

- **Center (Domain)**: Business rules, entities, value objects
- **2nd Layer (Application)**: Use cases, business logic coordination
- **Outer Layer (Infrastructure, Presentation)**: External connections (DB, API, external services)
- **DI Layer**: Connects all layers and resolves dependencies

### Dependency Rules

**Direction**: Only from outer to inner layers. Inner layers must not know about outer layer implementations.

| Layer              | Can import                     | Cannot import                |
| ------------------ | ------------------------------ | ---------------------------- |
| **Domain**         | None (completely independent)  | Everything                   |
| **Application**    | Domain, other Application      | Infrastructure, Presentation |
| **Infrastructure** | Domain, Application            | Presentation                 |
| **Presentation**   | Application, Domain (DTO)      | Infrastructure (direct NG)   |
| **DI**             | Everything (special exception) | -                            |

### Key Constraints

- Application layer can only import from Domain layer
- DB operations must go through Repository interfaces
- Only DI layer can import from all layers (for dependency injection)
- Application layer must NOT directly import Infrastructure layer (DB models, etc.)
- Application layer must NOT write DB operations directly

---

## Layer Responsibilities

| Layer              | Responsibility                                            |
| ------------------ | --------------------------------------------------------- |
| **Domain**         | Business rules, entities, repository interfaces           |
| **Application**    | Use cases, business logic coordination                    |
| **Infrastructure** | DB operations, external service implementations           |
| **Presentation**   | API endpoints, request/response                           |
| **DI**             | Dependency injection, layer connections                   |

---

## Domain Layer

**Role**: The core of the business domain, defining business rules and entities as a pure layer.

**Directory structure**:

```
backend/app/domain/
├── entities/              # Entities
│   ├── user.py
│   ├── product.py
│   └── order.py
├── repositories/          # Repository interfaces
│   ├── user_repository.py
│   ├── product_repository.py
│   └── order_repository.py
└── value_objects/         # Value objects
    ├── email.py
    ├── money.py
    └── status.py
```

### 1. Entity

**What to write**:

- Core business data structures
- Basically corresponds to DB table structures
- **Business rules** for the entity (field operation rules)

**Important**: Entities should have **business logic**. They are not just data classes.

**Points**:

- Write business rules in entities (`create_with_number`, `update_from_request`, etc.)
- **Use Value Objects** to apply business rules (e.g., estimate number generation)
- **No DB operations**. Only data structures and rules.
- Use Pydantic `BaseModel` as the base class.

### 2. Value Object

**What to write**:

- When you need rules beyond type definitions
- Values where immutability is important

**Points**:

- **Immutability** (`frozen = True` - cannot be changed once created)
- **Equality determined by value** (not by ID)
- **Encapsulate business rules** (don't leak rule details to the Application layer!)
- Use Pydantic `BaseModel`.

### 3. Repository (Interface)

**What to write**:

- **Interfaces** (abstract classes) for DB operations implemented in the Infrastructure layer
- Define only method signatures (implementation is in the Infrastructure layer)

**Important**:

- **Application layer uses these interfaces**
- **Implementation is in the Infrastructure layer**

**Points**:

- **Define only interfaces in the Domain layer, no implementation** (only `pass`)
- Use entities as arguments and return values
- Define methods needed for business logic
  - Mainly CRUD operations
  - Complex methods could use query_service, but in this project all go in repositories

---

## Application Layer

**Role**: Application logic implementation. Define use cases and coordinate business logic.

**Directory structure**:

```
backend/app/application/
├── use_cases/             # Use cases
│   ├── user_usecase.py
│   ├── product_usecase.py
│   └── order_usecase.py
├── interfaces/            # Interface definitions
│   └── external_service.py
└── schemas/               # DTO (Data Transfer Object)
    ├── user_schemas.py
    ├── product_schemas.py
    └── order_schemas.py
```

### 1. Schema (DTO)

**What to write**:

- Data transfer objects
- Used in Application and Presentation layers
- Separate from entities (entities for business rules, DTOs for data transfer)

**Points**:

- Use Pydantic `BaseModel`
- May be shared between Application and Presentation layers
- Define separately from entities (entities for internal logic, DTOs for data transfer)

### 2. Usecase

**What to write**:

- Business logic for each endpoint
- Logic related to DB operations

**Key constraints**:

- Can ONLY import Domain layer and other Application layers
- Must NOT write DB operations directly (use Domain Repository)
- Must NOT use DB models (use Entities)

**Points**:

- Receive repository interfaces through the class constructor
  - **For external services (S3, CloudFront, etc.), use interfaces, not implementations**
- **Use Entity and Value Object** to apply business rules (don't write them directly)
- Convert results to DTOs and return them

---

## Infrastructure Layer

**Role**: External interface integration. Implementation of DB operations, external services (S3, Redis, Qdrant, etc.).

**Directory structure**:

```
backend/app/infrastructure/
├── db/
│   ├── models/                    # DB models
│   │   ├── user_model.py
│   │   ├── product_model.py
│   │   └── order_model.py
│   └── repositories/              # Repository implementations
│       ├── user_repository_impl.py
│       ├── product_repository_impl.py
│       └── order_repository_impl.py
├── security/                      # Security services
│   └── jwt_service.py
└── logging/                       # Logging services
    └── logging.py
```

### 1. Models (DB Models)

**What to write**:

- SQLAlchemy DB models
- Table definitions, column definitions, relation definitions

**Caution**:

- CASCADE is NOT recommended
- Use logical deletion or write sequential deletion logic in application or infra/repository

**Points**:

- Inherit from SQLAlchemy `Base`
- **Basically don't use CASCADE** (recommend logical deletion or manual deletion logic)

### 2. Repository Implementation

**What to write**:

- **Implementation** of repository interfaces defined in the Domain layer
- Concrete DB operation processing
- DB model <-> entity conversion

**Points**:

- Inherit the repository interface (e.g., `UserRepository`)
- **Must implement all methods defined in the Domain layer**
- Prepare conversion methods (`to_entity`, etc.) for reusability. Return entities as return values

**When adding a new method**:

1. Add the method to the Domain layer repository interface
2. Implement it in the Infrastructure layer repository implementation

### 3. Other External Services

**What to write**:

- Integration with external services like Redis, AWS S3, Qdrant, etc.
- Implement in `backend/app/infrastructure/`

---

## Presentation Layer

**Role**: User interface. API endpoint definitions and request/response handling.

**Directory structure**:

```
backend/app/presentation/
├── api/                    # API endpoints
│   ├── user_api.py
│   ├── product_api.py
│   └── order_api.py
└── schemas/                # Request/response definitions
    ├── user_schemas.py
    ├── product_schemas.py
    └── order_schemas.py
```

### 1. Schema (Request/Response)

**What to write**:

- Request and response definitions
- Validation using Pydantic

### 2. API (Endpoints)

**What to write**:

- FastAPI router definitions
- Endpoint implementations
- Usecase calls
- Authentication/authorization (Depends)

**Points**:

- Use `Depends` for dependency injection
  - `get_xxxx_usecase`: Inject Usecase (details below)
  - `get_current_company_id`: Get the current user's company ID (authenticated)
- In endpoints, basically **only call Usecase methods**
- Convert Application layer DTOs to Presentation layer responses (`from_domain` methods, etc.)
- Handle exceptions and convert to HTTP errors

---

## DI Layer

**Directory structure**:

```
backend/app/di/
├── user_management.py
├── product_management.py
├── order_management.py
└── ...
```

**Role**: Dependency injection. Connect layers and resolve dependencies.

**What to write**:

- Functions for injecting dependencies into each endpoint
- Generate Usecase instances and inject necessary repositories

**Important**:

- **This layer alone can import from Application, Domain, and Infra**

**Points**:

- Get DB session with `get_db` (FastAPI `Depends`)
- Create repository implementation instances (e.g., `UserRepositoryImpl`)
- Create external service instances (e.g., `S3Service`)
- Inject repositories and external services into Usecase
- Handle cases where multiple repositories or external services are needed

**Usage**:

- Use in Presentation layer API endpoints as follows:
  ```python
  @router.get("/users")
  def get_users(
      user_usecase: UserUsecase = Depends(get_user_usecase)  # <- DI
  ):
      # user_usecase already has dependencies injected
      result = user_usecase.get_users(...)
  ```

---

## Architecture Validation

This project includes automated verification that the onion architecture principles are followed.

### Running the Architecture Check

```bash
# Using Make
make onion-check

# Direct execution
python backend/scripts/check_onion_architecture.py
```

### CI/CD Integration

Architecture checks run automatically in GitHub Actions for pull requests affecting backend code. See `.github/workflows/backend-ci.yml` for details.

The checker validates:

- Domain layer has no dependencies on other layers
- Application layer depends only on Domain
- Infrastructure layer does not depend on Presentation
- No circular dependencies between modules

---

## Best Practices

1. **Keep the Domain layer pure**: No external dependencies, business logic only
2. **Use interfaces**: Define interfaces in Domain, implement in Infrastructure
3. **Dependency direction**: Always from outer to inner layers
4. **Avoid circular dependencies**: Each layer should have clear responsibilities
5. **Use Value Objects**: Encapsulate business rules in immutable value objects
6. **Separate DTOs and Entities**: Entities for business logic, DTOs for data transfer
7. **Independent testing**: Domain and Application layers should be testable without Infrastructure

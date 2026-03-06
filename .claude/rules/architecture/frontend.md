---
paths: frontend/**
---
# Frontend Architecture Guide

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [FSD Architecture](#fsd-architecture)
3. [Authentication Design](#authentication-design)
4. [Directory Structure](#directory-structure)
5. [Implementation Plan](#implementation-plan)

---

## Tech Stack

### Core Framework

- **Next.js 15.3.2** (App Router)
- **React 19.2.0**
- **TypeScript 5.4.5**

### UI Library

- **shadcn/ui** - Reusable component library
  - Radix UI 2.x based
  - class-variance-authority 0.7.0
- **Tailwind CSS 3.4.3** - Utility-first CSS framework
  - tailwindcss-animate 1.0.7

### State Management

- **Redux Toolkit 2.2.0** - Global state management (auth state, user info)
- **TanStack React Query 5.28.0** - Server state management, caching
  - React Query Devtools integration

### Form Management

- **React Hook Form 7.51.0** - Performant form management
- **Zod 3.22.4** - TypeScript type-safe validation
- **@hookform/resolvers 3.3.4** - Zod integration

### HTTP Communication

- **Axios 1.6.8** - HTTP client
  - Interceptor implementation (error handling, auth error processing)
  - Cookie-based auth support (withCredentials: true)
  - React Query integration

### Testing

- **Jest 29.7.0** - Test framework

### Code Quality

- **ESLint 8.57.0** - Static analysis
  - Next.js config (eslint-config-next 15.3.2)
  - TypeScript ESLint 7.18.0
  - eslint-plugin-boundaries 4.2.2 (FSD layer dependency checking)
  - Prettier integration
- **Prettier 3.2.5** - Code formatter
  - prettier-plugin-tailwindcss 0.6.9

### Infrastructure

- **Docker** - Containerization (Dockerfile implemented)
- **Docker Compose** - Development environment setup
- **GitHub Actions** - CI/CD (frontend-ci.yml implemented)

---

## FSD Architecture

### What is FSD (Feature-Sliced Design)?

An architectural pattern that hierarchically organizes frontend applications. It divides features by business domain, with each layer having clear responsibilities to improve maintainability and extensibility.

### Layer Hierarchy

```
Top Layer  -> App (Routing, page composition)
              ↓
            Page-Components (Page components)
              ↓
            Widgets (Reusable widgets)
              ↓
            Features (Use cases, business logic)
              ↓
            Entities (Domain models, API communication)
              ↓
Bottom     -> Shared (Shared components, utilities)
```

### Dependency Rules

**Direction**: Only from upper layers to lower layers. Different segments in the same layer cannot import each other.

| Layer               | Can import                          | Cannot import                           |
| ------------------- | ----------------------------------- | --------------------------------------- |
| **Shared**          | Shared                              | Everything                              |
| **Entities**        | Shared                              | Features, Widgets, Page-Components, App |
| **Features**        | Entities, Shared                    | Widgets, Page-Components, App           |
| **Widgets**         | Features, Entities, Shared          | Page-Components, App                    |
| **Page-Components** | Widgets, Features, Entities, Shared | App                                     |
| **App**             | Everything (top level)              | -                                       |

### Key Constraints

- Each layer can only import from lower layers
- Properly separate UI components and logic
- Lower layers must not import upper layers
- Avoid circular dependencies within the same layer

### index.ts Strategy

Considering compile performance and tree-shaking, follow this policy for `index.ts` placement.

#### Basic Policy

| Policy | Description |
| --- | --- |
| **Place per slice** | Place at the root of each feature slice (user-master, auth, etc.) |
| **No layer-level index** | Avoid large re-exports like `entities/index.ts` |
| **Export only public API** | Hide internal implementations, expose only what's needed externally |

#### Layer-specific Rules

```
# Good: Per slice
import { UserMasterContainer } from '@/page-components/user-master';
import { useLogin } from '@/features/auth/login';
import { authApi } from '@/entities/auth';
import { FilterBar } from '@/widgets/filter-bar';

# Bad: Layer-level mass re-export
import { UserMasterContainer, ItemMasterContainer, ... } from '@/page-components';
import { authApi, userApi, itemApi, ... } from '@/entities';
```

#### index.ts Placement per Layer

| Layer | index.ts location | Example |
| --- | --- | --- |
| page-components | Under each slice | `page-components/user-master/index.ts` |
| widgets | Under each widget | `widgets/filter-bar/index.ts` |
| features | Under each feature | `features/auth/login/index.ts` |
| entities | Under each entity | `entities/auth/index.ts` |
| shared | Under each submodule | `shared/lib/index.ts`, `shared/ui/form-fields/index.ts` |

---

## Shared Layer

### Role

Generic code, components, and utilities shared across the entire application.

### Directory Structure

```
frontend/src/shared/
├── api/                 # Shared API
│   ├── client/          # HTTP client
│   │   └── http-client.ts
│   └── types/           # API type definitions
│       └── index.ts
├── lib/                 # Custom hooks & libraries
│   └── react-query/     # React Query config
│       └── QueryProvider.tsx
├── types/               # Shared type definitions
├── ui/                  # Shared UI components
│   └── shadcn/          # shadcn/ui components
│       ├── lib/         # Utilities
│       │   └── utils.ts # cn function, etc.
│       └── ui/          # UI components
│           ├── button.tsx
│           ├── card.tsx
│           ├── input.tsx
│           └── label.tsx
└── utils/               # Utility functions
    ├── format/          # Format utilities
    │   └── date.ts
    └── storage/         # Storage operations
        └── storage.ts
```

### What to Include

- Primitive UI components without business logic
- Generic utility functions
- Data conversion, formatting, storage operations
- Basic value objects used across multiple features

### What NOT to Include

- Business logic dependent on specific features -> `features/`
- Page-specific components -> `widgets/` or `page-components/`
- Dependencies on other layers (features, widgets, app)

---

## Entities Layer

### Role

Data models, API communication, and domain logic per business domain.

### Directory Structure

```
frontend/src/entities/
├── auth/                        # Auth domain
│   ├── model/                   # Type definitions
│   │   ├── types.ts
│   │   └── user.ts
│   └── api/                     # API client
│       └── auth-api.ts
└── shared/                      # Shared between entities
```

### What to Include

- Domain entity definitions
- API response/request type definitions
- Data conversion logic (DTO <-> Entity)
- API communication logic for specific entities
- HTTP request/response handling
- Error handling

### What NOT to Include

- Page-specific logic -> `widgets/` or `page-components/`
- Complex use cases spanning multiple domains -> `features/`
- React Hooks or state management -> `features/`

### Design Points

- Clearly separate DTOs and entities
- Provide conversion methods (fromDTO, toDTO)
- Use Shared layer's httpClient
- Type-safe API calls

---

## Features Layer

### Role

Business use case implementation, React Hooks, state management.

### Directory Structure

```
frontend/src/features/
├── auth/
│   ├── login/
│   │   ├── model/               # Type definitions
│   │   │   └── types.ts
│   │   ├── lib/                 # Logic & Hooks
│   │   │   ├── use-login.ts
│   │   │   └── login-executor.ts
│   │   └── index.ts
│   ├── logout/
│   └── get-current-user/
└── shared/                      # Shared logic between features
```

### What to Include

- Use case implementations (CRUD operations, search, aggregation, etc.)
- Business logic coordination and combination
- React Hooks (data fetching, state management)
- Processing spanning multiple entities
- Validation logic
- Data transformation and processing logic

### What NOT to Include

- Entire page layouts -> `page-components/`
- Complex widgets (combination of multiple features) -> `widgets/`
- Generic utilities -> `shared/`
- Domain entity definitions -> `entities/`

### Design Points

- Encapsulate business logic with the Executor pattern
- Separate UI and logic with React Hooks
- Use entity API clients
- Error handling and state management

---

## Widgets Layer

### Role

Reusable widgets combining multiple features.

### Directory Structure

```
frontend/src/widgets/
├── common/                      # Common widgets
│   ├── header/                  # Header
│   └── side-filter/             # Side filter
└── auth/                        # Auth-related widgets
    └── login-form/
```

### What to Include

- Reusable components combining multiple Features
- Complex UI patterns used across pages
- UI components using Features logic

### What NOT to Include

- Entire page layouts -> `page-components/`
- Business logic alone -> `features/`
- Generic primitive components -> `shared/ui`

### Design Points

- **Reusability**: Design usable across multiple pages
- **Independence**: Works standalone with minimal props
- **Features integration**: Uses Features Hooks internally

---

## Page-Components Layer

### Role

Page-level components.

### Directory Structure

```
frontend/src/page-components/
├── login/
│   ├── ui/
│   │   ├── LoginContainer.tsx
│   │   └── LoginPage.tsx
│   ├── lib/
│   │   └── useLoginPage.ts
│   └── index.ts
└── dashboard/
    ├── ui/
    │   └── DashboardPage.tsx
    └── index.ts
```

### What to Include

- Page-level container components
- Page composition combining Widgets
- Page-specific custom hooks (search, filtering, etc.)
- Page-specific state management and Context
- Page-specific configuration files

### What NOT to Include

- Routing definitions -> `app/`
- Reusable Widgets -> `widgets/`
- Business logic -> `features/`
- Context spanning multiple pages -> `features/`

### Design Points

- Focus on assembling Widgets
- Separate logic with custom hooks
- Limit responsibility to layout and UI composition

---

## App Layer

### Role

The top-level layer of the application. Routing, page composition, global settings.

### Directory Structure

```
frontend/src/app/
├── (authenticated)/              # Routes requiring authentication
│   ├── layout.tsx               # Authenticated layout
│   ├── dashboard/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
├── (public)/                    # Public routes
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
├── layout.tsx                   # Root layout
├── globals.css                  # Global styles
└── providers.tsx                # Global providers
```

### What to Include

- Calling Page-Components container components (page.tsx)
- Common layout structures (layout.tsx)
- Logical route splitting with route groups
- Dynamic routes ([id])
- Global Context providers
- Authentication check middleware
- Global styles

### What NOT to Include

- Business logic -> `features/`
- Complex UI composition -> `page-components/`
- Data fetching logic -> `features/` or `page-components/`

### Design Points

- **Keep thin**: page.tsx should only call Page-Components
- **Focus on routing**: URL and component mapping
- **Use common layouts**: Define per hierarchy with layout.tsx

---

## Authentication Design

### Authentication Method

**Cookie-based JWT Authentication**

- Store JWT in httpOnly Cookie
- XSS attack prevention
- CSRF protection (sameSite setting)

### Cookie Settings

```typescript
{
  httpOnly: true,           // Not accessible from JavaScript
  secure: true,             // HTTPS only (production)
  sameSite: 'lax',          // CSRF protection
  path: '/',
  maxAge: 7 * 24 * 60 * 60  // 7 days
}
```

### Backend API

| Endpoint           | Method | Description                  |
| ------------------ | ------ | ---------------------------- |
| `/api/auth/login`  | POST   | Login, set Cookie            |
| `/api/auth/logout` | POST   | Logout, delete Cookie        |
| `/api/auth/me`     | GET    | Get current user info        |

### Authentication Flow

1. **Login**
   - User submits credentials via login form
   - Backend validates and sets JWT in Cookie
   - Frontend saves user info in Redux
   - Redirect to `/dashboard`

2. **Auth State Check**
   - Next.js Middleware checks Cookie existence
   - Each page calls `/api/auth/me` for full verification
   - Save user info in Redux store

3. **Logout**
   - Call `/api/auth/logout`
   - Backend deletes Cookie
   - Clear Redux store
   - Redirect to `/login`

### Next.js Middleware

**Role**: Access control for protected routes

### React Query Integration

- Login/logout APIs managed by React Query
- Benefits of caching and refetch
- Redux store updated on successful authentication

---

## Directory Structure

### Complete Directory Tree

```
frontend/
├── src/
│   ├── app/                     # App layer
│   │   ├── (authenticated)/     # Authenticated routes
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/
│   │   │       └── page.tsx
│   │   ├── (public)/            # Public routes
│   │   │   ├── layout.tsx
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── providers.tsx
│   │   └── middleware.ts
│   ├── page-components/         # Page-Components layer
│   │   ├── login/
│   │   └── dashboard/
│   ├── widgets/                 # Widgets layer
│   │   ├── common/
│   │   └── auth/
│   ├── features/                # Features layer
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── logout/
│   │   │   └── get-current-user/
│   │   └── shared/
│   ├── entities/                # Entities layer
│   │   ├── auth/
│   │   │   ├── model/
│   │   │   └── api/
│   │   └── shared/
│   ├── shared/                  # Shared layer
│   │   ├── api/
│   │   │   ├── client/
│   │   │   └── types/
│   │   ├── lib/
│   │   │   └── react-query/
│   │   ├── types/
│   │   ├── ui/
│   │   │   └── shadcn/
│   │   └── utils/
│   │       ├── format/
│   │       └── storage/
│   └── store/                   # Redux store
│       ├── index.ts
│       └── slices/
│           └── authSlice.ts
├── public/
├── docs/                        # Documentation
├── .env.local.example
├── .eslintrc.json
├── .prettierrc
├── jest.config.js
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── Dockerfile
└── .dockerignore
```

---

## Development Guidelines

### Coding Conventions

1. **TypeScript strict mode enabled**
   - Always use `strict: true`
   - Minimize `any` usage

2. **Naming conventions**
   - Components: PascalCase (`LoginPage.tsx`)
   - Hooks: camelCase (`useLogin.ts`)
   - Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
   - File names: kebab-case or PascalCase (consistent)

3. **Import order**

   ```typescript
   // 1. External libraries
   import React from "react";
   import { useQuery } from "@tanstack/react-query";

   // 2. Internal modules (FSD order)
   import { LoginPage } from "@/page-components/login";
   import { useLogin } from "@/features/auth/login";
   import { authApi } from "@/entities/auth/api";
   import { Button } from "@/shared/ui/shadcn/button";

   // 3. Type definitions
   import type { User } from "@/entities/auth/model";
   ```

4. **FSD dependency checking**
   - Only import from upper to lower layers
   - Avoid dependencies within the same layer
   - Auto-checked by ESLint rules

### Code Review Points

- [ ] Compliant with FSD architecture
- [ ] Proper type definitions
- [ ] Error handling implemented
- [ ] Tests written
- [ ] Placed in appropriate layer

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

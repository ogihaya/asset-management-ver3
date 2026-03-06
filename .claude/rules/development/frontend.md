---
paths: frontend/**
---
# Frontend Development Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Flow](#development-flow)
3. [FSD Layer Usage](#fsd-layer-usage)
4. [API Integration](#api-integration)
5. [State Management](#state-management)
6. [Form Implementation](#form-implementation)
7. [UI Components](#ui-components)
8. [Coding Conventions](#coding-conventions)

---

## Getting Started

This guide explains practical development methods using the AI Solution Template.

### Prerequisites

- Understanding of FSD architecture from the Frontend Architecture Guide
- Frontend environment setup completed
- Basic knowledge of React, TypeScript, Next.js

---

## Development Flow

Basic flow when adding new features:

### 1. Type Definitions & API Client (Entities Layer)

```
entities/[domain]/
  ├── model/types.ts    # Type definitions
  └── api/[domain]-api.ts  # API calls
```

**Tasks:**

- Define domain model types
- Implement API functions using HTTP client

### 2. Business Logic (Features Layer)

```
features/[domain]/[use-case]/
  ├── model/types.ts    # Form data types, etc.
  └── lib/use-[name].ts # Custom Hook
```

**Tasks:**

- Create Hooks using React Query's useQuery or useMutation
- Call Entities APIs

### 3. UI Components (Widgets Layer - Optional)

```
widgets/[domain]/[name]-widget/
  └── ui/[Name]Widget.tsx
```

**Tasks:**

- Reusable components combining multiple Features
- Not needed for simple pages

### 4. Page Composition (Page-Components Layer)

```
page-components/[page-name]/
  └── ui/[PageName]Page.tsx
```

**Tasks:**

- Arrange Widgets to compose the full page
- Page-specific layout

### 5. Routing (App Layer)

```
app/(authenticated)/[page-name]/
  └── page.tsx
```

**Tasks:**

- Just import and display the Page-Component

---

### Examples

| Task | Location |
| --- | --- |
| User list API | `entities/user/api/user-api.ts` |
| User search Hook | `features/user/search-users/lib/use-search-users.ts` |
| Login form | `widgets/auth/login-form/ui/LoginForm.tsx` |
| Login page | `page-components/login/ui/LoginPage.tsx` |
| Date format function | `shared/utils/format/date.ts` |
| Button component | `shared/ui/shadcn/button.tsx` |

---

## API Integration

### HTTP Client Basics

**Location:** `shared/api/client/http-client.ts` (pre-configured)

```typescript
import httpClient from "@/shared/api/client/http-client";

// GET
const response = await httpClient.get<User>("/api/users/123");

// POST
const response = await httpClient.post<User>("/api/users", data);

// PUT
const response = await httpClient.put<User>("/api/users/123", data);

// DELETE
await httpClient.delete("/api/users/123");
```

### React Query Integration

#### Data Fetching (useQuery)

```typescript
// features/user/get-user/lib/use-user.ts
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/entities/user/api/user-api";

export function useUser(userId: string) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => userApi.getById(userId),
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
}
```

#### Data Mutation (useMutation)

```typescript
// features/user/update-user/lib/use-update-user.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/entities/user/api/user-api";

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserRequest) => userApi.update(data),
    onSuccess: () => {
      // Invalidate cache and refetch
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
```

---

## State Management

### Two State Management Approaches

| State Type | Library | Examples |
| --- | --- | --- |
| **Global state** (app-wide) | Redux Toolkit | Auth state, user info, theme |
| **Server state** (from API) | React Query | User list, post data, search results |

## Form Implementation

### React Hook Form + Zod

### Key Points

- Define validation with Zod (types auto-generated)
- Error messages in Japanese
- Prevent double submission with `isSubmitting`

---

## UI Components

### Using shadcn/ui

**Currently available:**

- Button, Card, Input, Label

**Adding new components:**

```bash
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add dropdown-menu
```

Components are automatically added to `shared/ui/shadcn/`.

### Custom Components

Place project-specific UI components in `shared/ui/components/`.

---

## Coding Conventions

### Naming Rules

| Target | Convention | Example |
| --- | --- | --- |
| Components | PascalCase | `LoginPage.tsx` |
| Hooks | camelCase + use prefix | `useLogin.ts` |
| Functions | camelCase | `formatDate.ts` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |
| Types | PascalCase | `User`, `LoginFormData` |

### FSD Dependency Rules

```typescript
// Bad: Import upper layer from Shared layer
import { useLogin } from "@/features/auth/login/lib/use-login"; // NG

// Good: Only lower to upper
import httpClient from "@/shared/api/client/http-client"; // OK
```

> Note: Barrel files (index.ts) are not used. Import directly by file path for faster compilation.

**Auto-checked by ESLint!**

### TypeScript Style

```typescript
// Good: Prefer type
export type User = { id: string; name: string };

// Good: Explicit return types
export function getUser(id: string): Promise<User> { ... }

// Bad: Using any
function process(data: any) { ... }

// Good: Use unknown
function process(data: unknown) {
  if (typeof data === 'object') { ... }
}
```

## References

- Frontend Architecture Guide - Architecture details
- Testing Guide - Tests
- [Feature-Sliced Design](https://feature-sliced.design/)
- [React Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com/)

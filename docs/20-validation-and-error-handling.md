# 20 — Validation & Error Handling

- **Status:** Approved Architecture Specification
- **Owner:** Core Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies Zod schema validation rules, custom domain exceptions, and error response formats.

---

## 1. Validation Hierarchy

```
[Form Input] ──► [Client Zod Schema] ──► [Server Action / API] ──► [Server Zod Schema] ──► [Domain Service]
```

- Client components validate user input instantly for visual field feedback.
- Server Actions and Route Handlers ALWAYS re-evaluate payloads using identical Zod schemas before calling service functions.

---

## 2. Standardized Custom Exception Hierarchy

```typescript
export class ApplicationError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, public errors?: any) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message = 'Unauthorized') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message = 'Forbidden') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class BusinessRuleError extends ApplicationError {
  constructor(message: string) {
    super(message, 'BUSINESS_RULE_ERROR', 422);
  }
}
```

---

## 3. Standard API Error Response Payload

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_ERROR",
    "message": "Cannot modify financial quantities of an already Issued invoice.",
    "statusCode": 422
  }
}
```

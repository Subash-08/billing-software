# 04 — Authentication Architecture

- **Status:** Approved Architecture Specification
- **Owner:** Security & Auth Team
- **Last Updated:** 2026-08-26
- **Purpose:** Defines user authentication, session persistence, security policies, and 1 User = 1 Business binding.

---

## 1. Authentication Engine & Credentials

Authentication is powered by **Better Auth**.

### Supported Auth Operations:
- Email and Password registration.
- Secure login with session cookies.
- Password reset via email token link.
- Logout & Session Revocation.

---

## 2. The 1 User = 1 Business Mapping Model

```
┌───────────────────────────────────────┐
│               User                    │
│ - _id: ObjectId                       │
│ - email: string                       │
│ - passwordHash: string                │
│ - isEmailVerified: boolean            │
└──────────────────┬────────────────────┘
                   │ 1:1 Binding (userId)
┌──────────────────▼────────────────────┐
│             Business                  │
│ - _id: ObjectId                       │
│ - userId: ObjectId (Unique Index)     │
│ - legalName: string                   │
│ - tradeName: string                   │
│ - gstin: string                       │
└───────────────────────────────────────┘
```

### Constraints:
- Every `User` document is linked to exactly one `Business` document (`userId` unique constraint).
- There are **NO workspace tables**, **NO team memberships**, **NO organization roles**, and **NO invitation endpoints**.

---

## 3. Session Context & Middleware Resolution

1. Client sends request with HTTP-only session cookie.
2. Better Auth server middleware authenticates cookie and extracts `session.userId`.
3. Server resolves associated `Business` record for `session.userId` and injects `session.businessId` into request context.
4. Server Actions and Route Handlers receive verified `businessId`.

```typescript
// Conceptual Server Middleware Scoping
export async function getAuthenticatedBusinessContext() {
  const session = await auth.getSession();
  if (!session || !session.user) {
    throw new AuthenticationError("Unauthorized access attempt");
  }
  const business = await BusinessModel.findOne({ userId: session.user.id }).select("_id").lean();
  if (!business) {
    throw new BusinessRuleError("Business profile setup incomplete");
  }
  return { userId: session.user.id, businessId: business._id };
}
```

---

## 4. Security Rules & Prohibitions

- **Rule 1:** Client payloads MUST NOT specify `businessId`.
- **Rule 2:** Password hashes use scrypt/argon2 via Better Auth default options.
- **Rule 3:** Authentication routes enforce rate limiting to prevent brute-force attacks.

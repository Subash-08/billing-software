# 39 — Authentication & Business Onboarding Architecture

- **Status:** Complete & Verified (v1.0 - Phase 6 Release)
- **Owner:** Security, Auth & Core Platform Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies user authentication, progressive registration, 1:1 business binding, server-side context resolution, navigation protection, and security boundaries.

---

## 1. Core Architectural Contracts

1. **Strict 1 User = 1 Business Model:** Every authenticated `User` is bound 1:1 to exactly ONE `Business` document via `Business.userId` unique index. There are NO roles, NO workspaces, NO organizations, and NO invitations.
2. **Server-Side Authorization Boundary:** Navigation protection in `src/middleware.ts` redirects unauthenticated users to `/login`. However, every Server Action, Route Handler, and Service independently validates the authenticated session and derives `businessId` server-side:
   $$\text{Session Cookie} \longrightarrow \text{User ID} \longrightarrow \text{Business.userId} \longrightarrow \text{businessId} \longrightarrow \text{Repository}$$
   Client-supplied `businessId` parameters in URLs or request payloads are strictly ignored.
3. **Progressive Registration & Non-Blocking Onboarding:** Registration is split into 3 steps:
   - **Step 1:** Account Credentials (Name, Email, Password)
   - **Step 2:** Business Basics (Business Name, Phone, Email, Address, City, State, Pincode)
   - **Step 3:** GST Compliance Setup (GST Registration Type, GSTIN syntax format, State Code)
   Upon entering the dashboard, users see a "Setup Completion Checklist" for optional items (bank details, logo metadata, invoice numbering).
4. **GSTIN Syntax Validation:** Format syntax regex (`/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`) validates entered GSTINs. Government portal verification is deferred. Unregistered businesses are not required to enter a GSTIN.
5. **Account Deletion Policy:** Account deletion is documented as `TBD / requires business & legal policy`. Financial transaction records (invoices, payments, receipts, audit logs) MUST NOT be physically deleted if an ordinary user account deletion request is received.

---

## 2. User-Without-Business State Handling

If an authenticated `User` exists in MongoDB but lacks an associated `Business` profile (due to interrupted registration or system error), `getAuthenticatedBusiness()` in `src/lib/auth-context.ts` automatically redirects the request to `/onboarding` instead of throwing a 500 server exception.

---

## 3. Security & Cross-Tenant Attack Rejection

- `BusinessService.updateBusinessProfile(targetBusinessId, authenticatedUserId, data)` validates that `targetBusinessId.userId` matches `authenticatedUserId`.
- If User A (authenticated as Business A) attempts to pass `businessId: Business B`, the system throws `ForbiddenError` (403 Access Denied) and Business B remains unmodified.

---

## 4. Live Data Migration Status

- `/settings/business`: Fully migrated to read and update live `Business` document from MongoDB Atlas via `businessService` and `/api/business/profile`. `MOCK_BUSINESS` is completely eliminated from business settings.
- Invoice, customer, and product pages remain on mock data until Phase 8+.

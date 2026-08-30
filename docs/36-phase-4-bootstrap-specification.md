# 36 — Phase 4 Bootstrap Specification

- **Status:** Approved Infrastructure Specification
- **Owner:** Core Engineering & DevOps
- **Last Updated:** 2026-08-26
- **Purpose:** Outlines exact Scope, Folder Architecture, Quality Gates, and Boundaries for Phase 4 Project Bootstrap.

---

## 1. Scope & Non-Goals for Phase 4

### Phase 4 Objectives (What is implemented):
1. Next.js 16 App Router setup with TypeScript strict mode.
2. `pnpm` package manager configuration.
3. Tailwind CSS & shadcn/ui design system foundation.
4. Scalable folder architecture (`src/app/`, `src/components/`, `src/features/`, `src/engine/`, `src/db/`, `src/services/`, `src/validations/`, `src/types/`, `src/config/`, `src/lib/`).
5. Environment variable schema validation via Zod (`src/config/env.ts`).
6. Core exception hierarchy & error logging foundation (`src/lib/errors.ts`, `src/lib/logger.ts`).
7. Mongoose database connection abstraction (`src/db/connection.ts`).
8. Testing infrastructure (Vitest for unit tests, Playwright for E2E tests).
9. High-contrast accounting dashboard layout shell (`NIRAMAALAI Billing & Payments` sidebar, top navigation, search, create button, and breadcrumb placeholders).

### Phase 4 Non-Goals (What is explicitly NOT implemented):
- NO MongoDB Mongoose domain models (Deferred to Phase 5).
- NO Better Auth user registration or login UI (Deferred to Phase 6).
- NO Customer or Product catalog forms (Deferred to Phases 8 & 9).
- NO GST calculation engine implementation (Deferred to Phase 10).
- NO Invoice creation or payment processing logic (Deferred to Phases 11-13).
- NO Cloudinary API calls or PDF generation.

---

## 2. Directory & Component Layout Architecture

```
src/
├── app/
│   ├── (auth)/                  # Auth route group
│   ├── (dashboard)/             # App dashboard layout & pages
│   │   ├── layout.tsx           # Global sidebar + header shell
│   │   └── page.tsx             # Dashboard structural shell
│   ├── api/                     # Server API Route Handlers
│   ├── globals.css              # Tailwind & shadcn CSS variables
│   └── layout.tsx               # Root HTML & Metadata shell
│
├── components/
│   ├── ui/                      # shadcn/ui primitives (Button, Card, Input, Badge, Dialog)
│   ├── layout/                  # Sidebar, Header, Breadcrumbs, UserNav
│   └── shared/                  # Reusable empty states, loading skeletons
│
├── features/                    # Feature domain modules (UI & handlers)
│   ├── auth/
│   ├── business/
│   ├── customers/
│   ├── products/
│   ├── services/
│   ├── invoices/
│   ├── payments/
│   ├── reports/
│   └── settings/
│
├── engine/                      # Standalone calculation & domain logic
│   ├── gst/                     # GST Tax calculation engine (Phase 10)
│   ├── invoice/                 # Invoice calculation pipeline (Phase 11)
│   ├── payments/                # Payment allocation engine (Phase 13)
│   └── numbering/               # Document sequence generator
│
├── db/                          # Database connection & Mongoose layer
│   ├── connection.ts            # MongoDB Atlas connection manager with pooling
│   ├── models/                  # Schemas (Phase 5)
│   └── repositories/            # Repository pattern implementations
│
├── services/                    # Infrastructure services
│   ├── pdf/                     # PDF generation (Phase 16)
│   ├── cloudinary/              # Cloudinary signed uploads (Phase 16)
│   ├── audit/                   # Audit logger service
│   └── integrations/            # External GSP/IRP adapters
│
├── validations/                 # Zod validation schemas
│   └── index.ts                 # Base validation utilities
│
├── types/                       # TypeScript interfaces & domain types
│   └── index.ts                 # Core type declarations
│
├── config/                      # Environment & application settings
│   └── env.ts                   # Zod validated environment process variables
│
└── lib/                         # Core utilities
    ├── errors.ts                # Application error class hierarchy
    ├── logger.ts                # Server & client logging utility
    └── utils.ts                 # Tailwind cn helper & formatters
```

---

## 3. Multi-Tenant Data Isolation & Security Foundation

- **Model:** 1 User Account = 1 Business Account. Single-user-per-business tenancy.
- **Tenant Scope:** Every business-owned database query MUST execute with `{ businessId: session.businessId }`.
- **Security Guard:** `businessId` parameters from client requests are rejected; `businessId` is derived strictly on the server from verified session context.

---

## 4. Definition of Done & Quality Gates for Phase 4

Phase 4 is complete only when all quality gates pass:
- [x] `pnpm typecheck` (TypeScript strict mode, 0 errors, 0 `any` types).
- [x] `pnpm lint` (ESLint clean, no broken imports or unhandled promises).
- [x] `pnpm test` (Vitest unit smoke tests passing).
- [x] `pnpm build` (Next.js production build succeeds without warnings).
- [x] Clean Accounting Layout shell matching NIRAMAALAI design (Sidebar navigation, header search bar, + Create action button).
- [x] No fake business data or dead interactive popups presented as working features.

# 03 — Technology Stack

- **Status:** Approved Architectural Decisions
- **Owner:** Core Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Documents technical stack choices, versions, dependencies, and infrastructural capabilities.

---

## 1. Core Technology Matrix

| Stack Component | Chosen Technology | Version / Requirement | Justification |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | 16+ (App Router) | High-performance Server Components, built-in Route Handlers, and Server Actions. |
| **Language** | TypeScript | 5.x+ (Strict Mode) | Strong type safety across financial entities, tax engine payloads, and API contracts. |
| **Database** | MongoDB Atlas | 7.0+ Compatible | Document database ideal for snapshotting historical invoice structures without complex joins. |
| **ORM / ODM** | Mongoose | 8.x+ | Structured schemas, middleware hooks, typed models, and compound indexing capabilities. |
| **Auth Engine** | Better Auth | Latest Stable | Secure session handling, password hashing, and straightforward single-user account model mapping. |
| **File Storage** | Cloudinary | REST API / SDK | Scalable storage for business logos, signatory images, attachments, and generated PDFs. |
| **Styling** | Tailwind CSS | 4.x / 3.4+ | Utility-first, clean design design system foundation. |
| **UI Components**| shadcn/ui | Latest | Accessible, customisable, un-styled primitives for professional accounting UI. |
| **Forms** | React Hook Form | 7.x+ | Performant, un-controlled form state management with low re-render overhead. |
| **Validation** | Zod | 3.x+ | Type-safe schema validation sharing types between client forms and server endpoints. |
| **Tables** | TanStack Table | 8.x+ | High performance table virtualisation, column sorting, pagination, and filtering. |
| **Charts** | Recharts | 2.x+ | SVG-based responsive financial analytics and sales trajectory charts. |
| **PWA Engine** | next-pwa / Serwist | Standard Web Manifest | Native app installation shell, service worker caching, standalone PWA mode. |
| **Testing** | Vitest & Playwright| Latest | Vitest for instant unit testing of GST math; Playwright for cross-browser E2E flows. |
| **Package Manager**| pnpm | 9.x+ | Fast, space-efficient deterministic dependency management. |

---

## 2. Infrastructure & Infrastructure Extensibility

- **Primary Initial Deployment Target:** Vercel (Edge network + Node.js Serverless runtime).
- **Future Infrastructural Targets:**
  - Standalone Docker containers (`Dockerfile` multi-stage build).
  - Virtual Private Server (VPS) via Docker Compose or Node process manager (PM2).
  - AWS ECS / Cloud Run / Kubernetes compatibility.
- **Rule:** Avoid Vercel-proprietary API lock-ins that break containerized deployments.

---

## 3. Library Constraints & Anti-Patterns

- **DO NOT** add alternative database ORMs (e.g. Prisma or TypeORM).
- **DO NOT** add alternative styling libraries (e.g. Styled Components or Emotion).
- **DO NOT** add state managers like Redux or MobX (React Hook Form + React State is sufficient).

# 02 — System Architecture

- **Status:** Approved Architecture Specification
- **Owner:** Core Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Outlines system layer structure, flow of requests, service boundaries, and data processing paths.

---

## 1. High-Level Architectural Layers

```
┌────────────────────────────────────────────────────────┐
│             Client Layer (Browser / PWA)               │
│   - Next.js Client Components ('use client')           │
│   - React Hook Form + Zod Client Validation            │
│   - Service Worker Cache & PWA App Shell               │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS (REST / Server Actions)
┌──────────────────────────▼─────────────────────────────┐
│             Next.js 16 Application Layer               │
│   - React Server Components (RSC) for Data Fetching    │
│   - Route Handlers (/api/*) for REST API Endpoints     │
│   - Server Actions for Interactive Form Mutations      │
│   - Session Auth Middleware (Better Auth)               │
└──────────────────────────┬─────────────────────────────┘
                           │ Session Context (businessId)
┌──────────────────────────▼─────────────────────────────┐
│                 Domain Services Layer                  │
│   - BusinessService, CustomerService, CatalogService   │
│   - InvoiceService, PaymentService, EInvoiceService    │
│   - Pure GST Calculation Engine (src/engine/gst/)     │
└──────────────────────────┬─────────────────────────────┘
                           │ Mongoose Query Scoping
┌──────────────────────────▼─────────────────────────────┐
│             Persistence & Infrastructure               │
│   - MongoDB Atlas (Document Database)                  │
│   - Cloudinary (Logos, Signatures, Attachments, PDFs)  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Responsibilities by Layer

### 2.1 Client Layer
- Responsible for rendering interactive components, collecting user input via controlled forms, handling optimistic UI updates, displaying validation errors, and invoking Server Actions or Route Handlers.
- ABSOLUTELY NO database operations or tax rule logic allowed here.

### 2.2 Application Layer (Next.js 16)
- **RSC (React Server Components):** Performs initial server-side data fetching directly from domain services. Returns pre-rendered HTML to browser.
- **Route Handlers:** Standard HTTP REST API endpoints for external integrations, mobile client interactions, or complex file downloads.
- **Server Actions:** Perform typed mutations triggered from React client components. Form input is re-validated via Zod schemas on the server before passing to domain services.

### 2.3 Domain Services Layer
- Houses business operations (e.g. `issueInvoice()`, `recordPayment()`, `calculateGst()`).
- Applies business rules, status checks, snapshot logic, and audit logging.
- Fully decoupled from HTTP requests/responses and React components.

### 2.4 Centralized GST Engine (`src/engine/gst/`)
- Pure functional module with 0 database dependencies. Accepts pricing, state codes, and tax rates; outputs deterministic CGST, SGST, IGST, and total amounts.

### 2.5 Persistence Layer
- Encapsulated Mongoose models ensuring `businessId` index filtering on every query.

---

## 3. Data Flow Diagram (Invoice Creation & Issue)

```
[Client Form] ──(Server Action)──► [Validation Middleware (Zod)]
                                             │
                                             ▼
                                  [Auth Context Resolver]
                                  (Extracts session.businessId)
                                             │
                                             ▼
                                  [Invoice Domain Service]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [GST Calculation Engine]                  [Business & Customer Repository]
          (Returns Tax & Item Totals)                    (Provides Master Details)
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             │
                                             ▼
                                  [Snapshot & Immutable Lock]
                                             │
                                             ▼
                                   [Mongoose Document Save]
                                             │
                                             ▼
                                     [Audit Log Event]
```

---

## 4. Architectural Decisions & Constraints

1. **Service Boundary Isolation:** UI components call services; UI components never query database models directly.
2. **Server-Side Truth:** All money calculations and status transitions are evaluated on the server.
3. **Immutability:** Once an invoice moves out of `Draft` state, it cannot be modified by standard update queries.

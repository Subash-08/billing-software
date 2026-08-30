# AGENTS.md — Global AI Agent Coding Rules & Behavioral Guidelines

> **Application:** Billing Software SaaS  
> **Target Audience:** All AI Coding Assistants, LLMs, Subagents, and Pair-Programming Tools  
> **Enforcement Level:** MANDATORY

---

## 1. CORE DIRECTIVES & ARCHITECTURAL CONTRACTS

You are an AI developer working on a production-grade Indian billing, invoicing, GST, and business management application. You must strictly follow all architectural specifications established in [`docs/`](file:///d:/Subash/project/billing-software/docs/) and [`ARCHITECTURE.md`](file:///d:/Subash/project/billing-software/ARCHITECTURE.md).

---

## 2. THE 15 MANDATORY CODING RULES

### RULE 1 — NEVER BREAK BUSINESS ISOLATION
- Every business-owned database query MUST be scoped to the authenticated user's `businessId`.
- NEVER trust `businessId` supplied by client payloads, query strings, or route parameters. Derive `businessId` strictly from verified server session context.

### RULE 2 — BUSINESS LOGIC DOES NOT BELONG IN UI
- React components MUST only render UI, handle form input events, and display data.
- UI components MUST NOT contain: GST calculation math, payment balance calculations, invoice numbering logic, direct Mongoose queries, or database access. Place business logic in domain services (`src/services/`).

### RULE 3 — GST IS CENTRALIZED & MULTI-COMPONENT (CGST, SGST, UTGST, IGST, CESS)
- All tax calculations MUST invoke the Centralized GST Calculation Engine (`src/engine/gst/`).
- Tax treatments (`TAXABLE`, `NIL_RATED`, `EXEMPT`, `NON_GST`, `ZERO_RATED`) must be evaluated BEFORE applying tax rates.
- Tax components include CGST, SGST, UTGST (for Union Territories), IGST, and Cess.
- NEVER hardcode a fixed rate list (`[0, 5, 12, 18, 28]`). Use versioned, effective-dated `TaxRate` master data.

### RULE 4 — MONEY & FINANCIAL PRECISION
- NEVER perform JS floating-point calculations (`0.1 + 0.2`) for monetary values.
- All monetary operations MUST use deterministic integer arithmetic (paisa) or exact decimal rounding helpers (`Math.round((amount + Number.EPSILON) * 100) / 100`).

### RULE 5 — HISTORICAL INVOICE IMMUTABILITY
- Issued invoices snapshot customer details, business info, tax rates, four address entities (Bill From, Dispatch From, Bill To, Ship To), and line items.
- NEVER write code that mutates historical invoice snapshots when customer master records or product catalog items are modified.

### RULE 6 — IMMUTABLE PAYMENT RECORDS & ALLOCATIONS
- Payments are immutable financial transaction events tied to `PaymentAllocation` entries.
- NEVER overwrite or wipe out payment history records to "fix" an invoice balance. Use reversal/adjustment transactions if corrections are required.

### RULE 7 — E-INVOICE REUSES COMMON ENGINE & USES IRP ADAPTER
- The E-Invoice module MUST reuse the underlying Common Invoice Engine for totals, items, and tax math.
- Use an **IRP Adapter Pattern** (`Invoice` $\to$ `EInvoice Service` $\to$ `Payload Builder` $\to$ `IRP Adapter`). Do not hardcode direct vendor API calls into invoice services.

### RULE 8 — CONFIGURABLE INVOICE TEMPLATES & DOCUMENT TYPES
- Invoice visual layouts MUST be modular and configurable (`InvoiceTemplateConfig`).
- Support document types: `TAX_INVOICE`, `BILL_OF_SUPPLY`, `CREDIT_NOTE`, `DEBIT_NOTE`, `QUOTATION`, `DELIVERY_CHALLAN`.

### RULE 9 — EXTENSIBILITY FIRST
- Before building a feature, verify: *"Can another tax type, payment mode, or document type be added without rewriting this?"*
- If not, refactor to interface-driven domain service boundaries before writing code.

### RULE 10 — UI/UX FOR NORMAL BUSINESS USERS
- Design interfaces for small Indian business owners, not developers.
- Use plain domain language ("Create Invoice", "Record Payment", "GST", "Outstanding").
- Employ progressive disclosure: Default inputs simple; advanced tax options collapsed.

### RULE 11 — TEST FINANCIAL LOGIC (50-SCENARIO MATRIX)
- Every tax calculation, discount formula, payment allocation, and status transition MUST have Vitest unit test coverage spanning the 50-scenario test matrix.

### RULE 12 — DON'T INVENT LEGAL OR GST RULES
- If a legal, tax, or E-Invoice requirement is ambiguous or underspecified, DO NOT make silent assumptions.
- Mark it clearly as `TBD - Requires CA/GST Expert Confirmation` and request user clarification.

### RULE 13 — NO DEAD UI
- Every visible button or action link MUST either be fully functional or explicitly marked with a disabled badge (e.g. *"Coming in Future Version"*).

### RULE 14 — DOCUMENT BEFORE MAJOR ARCHITECTURAL CHANGES
- If a task requires altering database schemas, the GST engine, authentication flows, or file storage, update the appropriate markdown document in `docs/` FIRST before writing code.

### RULE 15 — CODE QUALITY & STRICT TYPING
- TypeScript strict mode enabled. Forbidden: `any` types, magic numbers, hardcoded business values, monolithic files (> 300 lines), and silent exception swallowing.
- Schema validation via Zod on both client forms and server endpoints.

---

## 3. CHECKLIST BEFORE COMMITTING/EDITING

- [ ] Does this change respect the **1 User = 1 Business** model?
- [ ] Is `businessId` enforced in all database queries?
- [ ] Are money calculations exact and free of JS floating-point drift?
- [ ] Are UI components free of inline database access and tax calculation logic?
- [ ] Have unit tests been included for domain and GST logic modifications?
- [ ] Has documentation in `docs/` been updated if architectural contracts changed?

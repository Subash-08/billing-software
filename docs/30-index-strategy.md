# 30 — MongoDB Index Strategy & Query Performance

- **Status:** Approved Indexing Specification (v2.0 - Phase 3.5 Audited)
- **Owner:** Database Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies exact MongoDB index definitions, compound key order, unique constraints, and query performance rationale.

---

## 1. Multi-Tenant Indexing Philosophy

1. **Tenant Prefix Rule:** Compound indexes on business-owned collections MUST start with `businessId` as the leading index key.
2. **ESR Rule (Equality, Sort, Range):** Compound index fields follow Equality checks first, followed by Sort fields, followed by Range filters.

---

## 2. Complete Index Plan & Rationale

### 2.1 Collection: `users`
- `{ email: 1 }` (Unique) — Fast user login lookup by email.

### 2.2 Collection: `businesses`
- `{ userId: 1 }` (Unique) — Resolves single business profile for authenticated session user.

### 2.3 Collection: `customers`
- `{ businessId: 1, displayName: 1 }` — Fast customer list sorting and search within business context.
- `{ businessId: 1, phone: 1 }` — Quick customer duplicate check and lookup by phone.
- `{ businessId: 1, gstin: 1 }` — Look up registered customers by GSTIN.

### 2.4 Collection: `products` & `services`
- `{ businessId: 1, name: 1 }` — Catalog search by item name.
- `{ businessId: 1, code: 1 }` — Fast SKU item lookup during invoice entry.

### 2.5 Collection: `invoices`
- `{ businessId: 1, invoiceNumber: 1 }` (Unique) — Enforces unique invoice numbers per business.
- `{ businessId: 1, status: 1, invoiceDate: -1 }` — Filter invoices by status (Issued vs Draft) sorted by date.
- `{ businessId: 1, customerId: 1, paymentStatus: 1 }` — Calculate customer outstanding balances.
- `{ businessId: 1, invoiceDate: -1 }` — Main invoice list view sorted by creation date.

### 2.6 Collection: `payments`
- `{ businessId: 1, receiptNumber: 1 }` (Unique) — Enforces unique receipt numbers per business.
- `{ businessId: 1, "allocations.invoiceId": 1 }` — Fast query to find payments allocated to a specific invoice.
- `{ businessId: 1, customerId: 1 }` — Customer ledger payment transactions lookup.
- `{ businessId: 1, paymentDate: -1 }` — Date-range filtering for Collection and Cashflow reports.

### 2.7 Collection: `einvoices`
- `{ businessId: 1, invoiceId: 1 }` (Unique) — Ensures single E-Invoice IRN record per invoice.
- `{ irn: 1 }` (Unique, Sparse) — Global IRN 64-character hash lookup.

### 2.8 Collection: `taxRates`
- `{ rate: 1, status: 1 }` — Query active tax rates by rate percentage.

### 2.9 Collection: `paymentModes`
- `{ code: 1 }` — Payment mode lookup.

### 2.10 Collection: `documentSequences`
- `{ businessId: 1, documentType: 1, prefix: 1, financialYear: 1 }` (Unique) — Atomic counter lookup for invoice, credit note, and debit note sequences per FY.

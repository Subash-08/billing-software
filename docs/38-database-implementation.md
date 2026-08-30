# 38 — Database Implementation & Persistence Layer

- **Status:** Conditional Pass & Refined (Phase 5.1 Technical Audit & Cleanup)
- **Owner:** Database & Backend Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies the authoritative entity breakdown, Mongoose model definitions, repository architecture, multi-tenant isolation, money strategy, and seed safety controls.

---

## 1. Authoritative Phase 5 Entity List

Based on `docs/27-database-schema.md`, Phase 5 establishes **17 Top-Level Collection Models** and **3 Embedded Value Object Schemas**:

### Global Master Data (5 Collections)
| Entity | Collection | Global / Business-Owned | `businessId` Required | Indexes | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `User` | `users` | Global | No | `{ email: 1 }` (Unique) | Global account authentication identity |
| `Unit` | `units` | Global Master | No | `{ uqc: 1 }` (Unique) | Standard GST UQC measurement units (`PCS`, `KGS`, etc.) |
| `TaxRate` | `taxRates` | Global Master | No | `{ rate: 1, status: 1 }` | Versioned GST tax rate brackets |
| `HSNSAC` | `hsnSacs` | Global Master | No | `{ code: 1 }` (Unique) | Goods HSN & Services SAC directory |
| `PaymentMode` | `paymentModes` | Global Master | No | `{ code: 1 }` (Unique) | Standard payment settlement modes |

### Business-Owned Data (12 Collections)
| Entity | Collection | Global / Business-Owned | `businessId` Required | Indexes | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Business` | `businesses` | Business-Owned | Self (Root) | `{ userId: 1 }` (Unique) | Tenant root (1 User = 1 Business) |
| `Customer` | `customers` | Business-Owned | Yes | `{ businessId: 1, displayName: 1 }`, `{ businessId: 1, phone: 1 }`, `{ businessId: 1, gstin: 1 }` | Customer directory & embedded addresses |
| `Product` | `products` | Business-Owned | Yes | `{ businessId: 1, name: 1 }`, `{ businessId: 1, code: 1 }` | Physical item catalog master |
| `Service` | `services` | Business-Owned | Yes | `{ businessId: 1, name: 1 }` | Service catalog master |
| `Category` | `categories` | Business-Owned | Yes | `{ businessId: 1, name: 1 }` (Unique) | Item taxonomy classification |
| `Invoice` | `invoices` | Business-Owned | Yes | `{ businessId: 1, invoiceNumber: 1 }` (Unique), `{ businessId: 1, status: 1, invoiceDate: -1 }` | Tax invoices & bills of supply with snapshots |
| `Payment` | `payments` | Business-Owned | Yes | `{ businessId: 1, receiptNumber: 1 }` (Unique), `{ businessId: 1, customerId: 1 }` | Collection transaction ledger & allocations |
| `Receipt` | `receipts` | Business-Owned | Yes | `{ businessId: 1, receiptNumber: 1 }` (Unique) | Collection receipt voucher metadata |
| `Attachment` | `attachments` | Business-Owned | Yes | `{ businessId: 1, entityType: 1, entityId: 1 }` | Cloudinary file metadata references |
| `AuditLog` | `auditLogs` | Business-Owned | Yes | `{ businessId: 1, createdAt: -1 }` | Immutable append-only activity log |
| `EInvoice` | `einvoices` | Business-Owned | Yes | `{ businessId: 1, invoiceId: 1 }` (Unique), `{ irn: 1 }` (Unique, Sparse) | Government IRN state & payload record |
| `DocumentSequence` | `documentSequences` | Business-Owned | Yes | `{ businessId: 1, documentType: 1, prefix: 1, financialYear: 1 }` (Unique) | Atomic FY consecutive sequence counters |

### Embedded Value Object Schemas (3 Schemas - No Separate Collection)
1. **`CustomerAddress`**: Embedded inside `Customer` (`billingAddress`, `shippingAddresses[]`).
2. **`InvoiceItem`**: Embedded inside `Invoice` (`items[]`).
3. **`PaymentAllocation`**: Embedded inside `Payment` (`allocations[]`).

---

## 2. Single Authoritative Money Strategy (Integer Paise Arithmetic)

- **Law of Financial Precision:** Floating-point arithmetic (`0.1 + 0.2 != 0.3`) is **strictly forbidden** in financial domain logic.
- **Integer Paise Operations:** All financial calculations (gross item values, line discounts, taxable amounts, CGST, SGST, UTGST, IGST, Cess, subtotals, invoice discounts, additional charges, round-off adjustments, grand totals, payments, allocations, customer credit, and outstanding balances) operate strictly on **integer paise** ($\text{Rupees} \times 100$).
- **Explicit Boundaries:** Input values are explicitly converted to paise at input boundaries (`rupeesToPaise(val)` via `src/lib/money.ts`). Presentation boundaries convert paise to Rupee display strings (`paiseToRupees(paise)`).

---

## 3. Multi-Tenant Business Isolation Verification

Repository methods strictly scope all database queries by `businessId`:
- **Query Construction Unit Tests:** Assert that repository filters explicitly generate `{ _id, businessId }`.
- **Real MongoDB Persistence Integration Tests:** Executed against MongoDB database in `tenant-isolation.test.ts`:
  - Verified `Business A` cannot read `Business B` customers, invoices, payments, products, services, or categories.
  - Verified `Business A` update and delete operations on `Business B` records return `null` and modify 0 documents.

---

## 4. PaymentMode & TaxRate Architecture Clarification

- **`PaymentMode` Architecture:** `PaymentMode` (`paymentModes`) acts as a **Global Master Reference** for standard system payment settlement modes (`CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE`, `CARD`, `CUSTOM`). Business-specific enable/disable settings, custom collection labels, and display order are stored in `Business.paymentSettings`.
- **`TaxRate` Versioning Query Note:** The index `{ rate: 1, status: 1 }` indexes rate brackets. When calculating tax for a given invoice date (Phase 10), the GST engine will query effective date ranges (`effectiveFrom <= invoiceDate AND (effectiveTo IS NULL OR effectiveTo >= invoiceDate)`).

---

## 5. Security & Environment Configuration

- **Committed Placeholders:** `.env.example` contains variable names only with no credentials.
- **Local Secrets:** Local `.env` contains local development URI and secrets and is ignored by `.gitignore` (`.env`, `.env.local`, `.env.*.local`).
- **Server Secrets Protection:** `MONGODB_URI`, `BETTER_AUTH_SECRET`, `CLOUDINARY_API_SECRET`, `IRP_API_KEY`, `IRP_API_SECRET` are never exposed through `NEXT_PUBLIC_` prefixes.

---

## 6. Seed Safety Safeguards

- Command: `pnpm db:seed` ([seed.ts](file:///d:/Subash/project/billing-software/src/db/seed.ts))
- Multi-layer safety checks:
  1. Throws an exception if `NODE_ENV === 'production'`.
  2. Throws an exception if `process.env.ALLOW_DB_SEED === 'false'`.
  3. Throws an exception if `MONGODB_URI` contains `prod` keywords.

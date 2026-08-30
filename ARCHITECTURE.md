# Billing Software SaaS — Architecture Specification

> **Version:** 4.0.0  
> **Status:** Phase 0, Phase 1, Phase 2, Phase 3, Phase 3.5 & Phase 3.6 GST Compliance Audited Specification  
> **Target Region:** India (GST Compliant, Invoice-Focused Business Management)

---

## 1. System Architecture Overview

The system uses a layered full-stack Next.js 16 architecture with clear separation of concerns:

```
┌────────────────────────────────────────────────────────┐
│             Browser / Installable PWA                  │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / REST / Server Actions
┌──────────────────────────▼─────────────────────────────┐
│                 Next.js 16 App Router                  │
│   ┌──────────────────────┐    ┌────────────────────┐   │
│   │ React Server Component│    │ Client Component   │   │
│   └──────────┬───────────┘    └─────────┬──────────┘   │
│              │                          │ Form / UI    │
│   ┌──────────▼──────────────────────────▼──────────┐   │
│   │        Route Handlers / Server Actions         │   │
│   └──────────────────────┬─────────────────────────┘   │
└──────────────────────────┼─────────────────────────────┘
                           │ Session Authenticated Context
┌──────────────────────────▼─────────────────────────────┐
│                 Application Services Layer             │
│   (Auth, Business, Customer, Catalog, Invoice, Payment) │
└──────────────────────────┬─────────────────────────────┘
                           │ Domain Entities & Contracts
┌──────────────────────────▼─────────────────────────────┐
│       Centralized GST Calculation Engine (src/engine/gst) │
│       (Tax Treatments, UTGST, CGST, SGST, IGST, Cess)  │
└──────────────────────────┬─────────────────────────────┘
                           │ Mongoose Schemas & Repos
┌──────────────────────────▼─────────────────────────────┐
│                     MongoDB Atlas                      │
└────────────────────────────────────────────────────────┘
```

External Services:
- **Better Auth:** Authentication & Session Management
- **Cloudinary:** Media & Document Storage (Logos, Signatures, Attachments, Generated PDFs)

---

## 2. Three Separate Layers of Truth

```
                 LAYER 1: MASTER DATA (Mutable)
     ┌──────────────────────┼──────────────────────┐
  Customer               Product                Business
(Directory)             (Catalog)              (Profile)
     │                      │                      │
     └──────────────────────┼──────────────────────┘
                            │ [Snapshot at Issue Time]
                            ▼
                 LAYER 2: INVOICES (Immutable)
       Invoice Items + 4 Addresses + Tax + Cess + Supply Details
                            │
                            ▼ [Transaction Ledger & Allocations]
                 LAYER 3: PAYMENTS (Immutable)
             Payment Transactions & PaymentAllocations
                            │
                            ▼ [Derived Aggregation]
                  OUTSTANDING & REPORTS
```

---

## 3. GST Decision Pipeline

```
  Transaction ──► Tax Applicability ──► Tax Treatment ──► Tax Rule ──► Tax Rate ──► Components ──► Calculation Trace
```

### Supported Components:
- **CGST:** Central GST (50% of rate for Intra-State/UT).
- **SGST:** State GST (50% of rate for Intra-State).
- **UTGST:** Union Territory GST (50% of rate for Intra-UT).
- **IGST:** Integrated GST (100% of rate for Inter-State/UT).
- **CESS:** Applicable Cess percentage or specific levy.

---

## 4. Domain Module Map & Database Entity Index

| Module | Core Responsibility | Primary Database Entities |
| :--- | :--- | :--- |
| **Auth** | User identity, registration, session validation | `User` |
| **Business** | Profile, GSTIN, branding, bank details, signatory, document sequence | `Business`, `DocumentSequence` |
| **Customer** | Customer master records, GST details, embedded billing/shipping addresses | `Customer` (`CustomerAddress`) |
| **Catalog** | Catalog items, units, categories, HSN/SAC versioned lookup | `Product`, `Service`, `Category`, `Unit`, `HSNSAC` |
| **GST Engine** | Pure tax logic, tax treatments, UTGST, CGST/SGST/IGST, Cess, versioned rates | `TaxRate`, `HSNSAC` |
| **Invoice** | Invoice creation, 4 address snapshots, supply/transport details, tax snapshots, item pricing | `Invoice` (`InvoiceItem`) |
| **Payment** | Payment transaction recording, allocations, customer credit, receipts | `Payment` (`PaymentAllocation`), `Receipt`, `PaymentMode` |
| **E-Invoice** | Isolated module for IRN state machine, IRP adapter, 30-day reporting restriction | `EInvoice` |
| **Template** | Configurable visual invoice printable layouts | `InvoiceTemplateConfig` |
| **Storage** | Asset uploading metadata, Cloudinary URL mapping | `Attachment` |
| **Audit** | Immutable logging of financial & business configuration events | `AuditLog` |

---

## 5. Security & Data Isolation Guarantees

1. **Session-Bound Queries:** All repository queries automatically append `{ businessId: session.businessId }`.
2. **Signed Cloudinary Uploads:** Presigned parameters expire within 15 minutes.
3. **Audit Trails:** All financial status transitions generate an append-only `AuditLog` entry.

---

## 6. Open Decisions & TBD Items

1. **Invoice Round-Off Policy:** Configurable nearest rupee round-off per business setting `[TBD - Requires CA Confirmation]`.
2. **Reverse Charge Mechanism (RCM):** Schema supports flag; automated liability ledger posting marked TBD upon CA review.

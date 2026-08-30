# 06 — Database Architecture

- **Status:** Approved Architecture Specification
- **Owner:** Database Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies MongoDB Atlas collections, Mongoose schema patterns, indexing strategy, and snapshotting rules.

---

## 1. Primary MongoDB Collections

```
billing_software DB
├── users                     (Auth credentials & global user data)
├── businesses                (1:1 business profile per user)
├── customers                 (Master customer address & GST lookup)
├── products                  (Master catalog of products)
├── services                  (Master catalog of services)
├── categories                (Catalog categories)
├── units                     (Measurement units: Pcs, Kg, Mtr, Nos)
├── invoices                  (Invoice documents with embedded snapshots)
├── payments                  (Individual payment transaction ledger)
├── receipts                  (Generated payment receipts)
├── auditLogs                 (Immutable financial and setup audit events)
├── einvoices                 (E-Invoice IRP payloads and IRN acknowledgements)
└── attachments               (Cloudinary file metadata)
```

---

## 2. Multi-Tenant Compound Indexing Strategy

Every business-owned collection model MUST include `businessId` as the primary prefix field in compound indexes to enforce data isolation and fast query lookup performance:

| Collection | Index Fields | Purpose / Query Pattern |
| :--- | :--- | :--- |
| `businesses` | `{ userId: 1 }` (Unique) | Resolve business profile from session user ID. |
| `customers` | `{ businessId: 1, phone: 1 }` | Fast customer search by phone. |
| `customers` | `{ businessId: 1, gstin: 1 }` | Fast customer search by GSTIN. |
| `products` | `{ businessId: 1, code: 1 }` | Catalog lookup by SKU/item code. |
| `services` | `{ businessId: 1, name: 1 }` | Catalog lookup by service name. |
| `invoices` | `{ businessId: 1, invoiceNumber: 1 }` (Unique) | Enforce unique invoice numbering per business. |
| `invoices` | `{ businessId: 1, status: 1, invoiceDate: -1 }` | Filter invoices by status sorted by date. |
| `invoices` | `{ businessId: 1, customerId: 1, paymentStatus: 1 }` | Derive customer outstanding balances. |
| `payments` | `{ businessId: 1, invoiceId: 1 }` | List payments made for a specific invoice. |
| `payments` | `{ businessId: 1, paymentDate: -1 }` | Date range query for collection reports. |
| `auditLogs` | `{ businessId: 1, createdAt: -1 }` | Fetch recent business activity log. |

---

## 3. Invoice Snapshot Pattern (Historical Protection)

To comply with accounting and GST legal immutability standards, historical invoices DO NOT rely on dynamic population of master references for financial calculation or printing.

```
Invoice Document
  ├── customerSnapshot (Name, Address, State, GSTIN, State Code at issue time)
  ├── businessSnapshot (Name, Address, GSTIN, Bank details, Logo at issue time)
  └── items[]
        ├── name
        ├── hsnSacCode
        ├── unit
        ├── unitPrice
        ├── discountAmount
        ├── gstRate
        ├── cgstAmount
        ├── sgstAmount
        └── igstAmount
```

Changing a customer's address in the `customers` collection after an invoice is issued will NEVER modify the `customerSnapshot` inside the issued `Invoice` document.

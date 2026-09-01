# 29 — Data Integrity & Financial Source of Truth

- **Status:** Approved Integrity Specification (v3.0 — GST Module Upgrade)
- **Owner:** Database & Financial Engineering
- **Last Updated:** 2026-08-31
- **Purpose:** Establishes the three separate layers of truth, snapshot integrity rules, payment balance calculations, multi-tenant scoping, and the Schema Migration Hard Gate protocol.

---

## 1. Three Separate Layers of Truth Architecture

To prevent data corruption, illegal updates, and broken financial ledgers, the application maintains **three distinct, non-overwriting layers of truth**:

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
             Invoice Items + Addresses + Tax + Cess + Supply Details
                            │
                            ▼ [Transaction Ledger & Allocations]
                 LAYER 3: PAYMENTS (Immutable)
             Payment Transactions & PaymentAllocations
                            │
                            ▼ [Derived Aggregation]
                  OUTSTANDING & REPORTS
```

### Integrity Laws:
1. **Master Data Edits NEVER Mutate Invoices:** Editing a customer's address, GSTIN, or product selling price in Master Data DOES NOT update past issued invoices.
2. **GST Settings Edits NEVER Mutate Past Invoices:** Changing business GSTIN or tax rates applies to FUTURE invoices only.
3. **Payment Ledgers are Immutable:** Payments and payment allocations are immutable financial records. Overwriting payment history to "fix" an invoice balance is forbidden (Invariant 10).
4. **Customer Balance is Derived, Not Stored:** Customer outstanding balance is NEVER stored as a static editable scalar field on the `Customer` document. It is dynamically computed as:
   $$\text{Customer Outstanding} = \sum \text{Invoice Grand Totals} - \sum \text{Allocated Payment Amounts}$$

---

## 2. Immutable Invoice Snapshots

When an invoice transitions from `DRAFT` to `ISSUED`, the server captures explicit JSON snapshots:
- **`businessSnapshot`:** Legal Name, Trade Name, GSTIN, Address, State, State Code, Bank Details, Logo URL.
- **`billToSnapshot`:** Display Name, Company Name, Address, State, State Code, GSTIN.
- **`shipToSnapshot`:** Recipient Name, Delivery Address, State, State Code, GSTIN.
- **`items[]` (v8 canonical):** `itemType`, `hsnCode`, `sacCode`, `unit`, `uqc`, `enteredRatePaise`, `isPriceInclusiveOfGst`, `discountType`, `discountValueRaw`, `discountAmountPaise`, `taxTreatment`, `gstRate`, `cgstRate`, `sgstRate`, `igstRate`, `taxRateId`, `taxRateVersion`, `taxableAmountPaise`, `cgstAmountPaise`, `sgstAmountPaise`, `utgstAmountPaise`, `igstAmountPaise`, `cessRate`, `cessAmountPaise`, `totalAmountPaise`.

Once `status == "ISSUED"`, these snapshot objects are frozen and read-only.

---

## 3. Server-Side Data Isolation Protocol

Every Mongoose database operation MUST execute tenant filtering based on `session.businessId`:

```typescript
// SECURE PATTERN — Mandatory Business Scoping
export async function getInvoiceById(invoiceId: string, sessionBusinessId: string) {
  const invoice = await InvoiceModel.findOne({
    _id: invoiceId,
    businessId: sessionBusinessId // Tenant boundary explicitly enforced
  });
  if (!invoice) {
    throw new NotFoundError("Invoice not found or access denied");
  }
  return invoice;
}
```

Client-supplied `businessId` parameters are strictly rejected by server middleware.

---

## 4. Migration Hard Gate Protocol

> **CRITICAL:** Deploying code before running the database migration will immediately cause `NaN` errors because new code reads `enteredRatePaise` while old documents contain `rate`. Migration is a **HARD DEPLOYMENT GATE**.

### Gate Sequence:
```
  1. Full Database Backup
        ↓
  2. Execute migration script (`src/scripts/migrate-invoice-snapshot-v8.ts`) on DB copy
        ↓
  3. Execute Reconciliation Assertions:
     a. count(beforeInvoices) === count(afterInvoices)
     b. SUM(before grandTotal) === SUM(after grandTotalPaise / 100)
     c. Spot-check 10 random documents for non-null `enteredRatePaise` and valid `hsnCode`/`sacCode`
        ↓
  4. Run migration script on LIVE DB
        ↓
  5. Re-run Reconciliation Assertions on LIVE DB
        ↓
  6. DEPLOY NEW CODE
```

### Migration Field Transformations:

| Old Field Name | New Field Name | Rule |
|---|---|---|
| `items[].rate` | `items[].enteredRatePaise` | Renamed (value preserved) |
| `items[].discountAmount` | `items[].discountAmountPaise` | Renamed (value preserved) |
| `items[].taxableAmount` | `items[].taxableAmountPaise` | Renamed (value preserved) |
| `items[].cgstAmount` | `items[].cgstAmountPaise` | Renamed (value preserved) |
| `items[].sgstAmount` | `items[].sgstAmountPaise` | Renamed (value preserved) |
| `items[].igstAmount` | `items[].igstAmountPaise` | Renamed (value preserved) |
| `items[].utgstAmount` | `items[].utgstAmountPaise` | Renamed (value preserved) |
| `items[].cessAmount` | `items[].cessAmountPaise` | Renamed (value preserved) |
| `items[].totalAmount` | `items[].totalAmountPaise` | Renamed (value preserved) |
| `items[].hsnSacCode` | `items[].hsnCode` / `items[].sacCode` | Split based on `itemType`: if `itemType === 'SERVICES'` → `sacCode`, else `hsnCode` |
| *(missing)* | `items[].itemType` | Set to `'GOODS'` if undefined |
| *(missing)* | `items[].isPriceInclusiveOfGst` | Set to `false` if undefined |
| *(missing)* | `items[].cgstRate` | Set to `gstRate / 2` (or `0` for inter-state) |
| *(missing)* | `items[].sgstRate` | Set to `gstRate / 2` (or `0` for inter-state) |
| *(missing)* | `items[].igstRate` | Set to `gstRate` (inter-state) or `0` (intra-state) |
| *(missing)* | `items[].taxRateVersion` | Set to `'1.0'` |


---

## 1. Three Separate Layers of Truth Architecture

To prevent data corruption, illegal updates, and broken financial ledgers, the application maintains **three distinct, non-overwriting layers of truth**:

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
             Invoice Items + Addresses + Tax + Cess + Supply Details
                            │
                            ▼ [Transaction Ledger & Allocations]
                 LAYER 3: PAYMENTS (Immutable)
             Payment Transactions & PaymentAllocations
                            │
                            ▼ [Derived Aggregation]
                  OUTSTANDING & REPORTS
```

### Integrity Laws:
1. **Master Data Edits NEVER Mutate Invoices:** Editing a customer's address, GSTIN, or product selling price in Master Data DOES NOT update past issued invoices.
2. **GST Settings Edits NEVER Mutate Past Invoices:** Changing business GSTIN or tax rates applies to FUTURE invoices only.
3. **Payment Ledgers are Immutable:** Payments and payment allocations are immutable financial records. Overwriting payment history to "fix" an invoice balance is forbidden.
4. **Customer Balance is Derived, Not Stored:** Customer outstanding balance is NEVER stored as a static editable scalar field on the `Customer` document. It is dynamically computed as:
   $$\text{Customer Outstanding} = \sum \text{Invoice Grand Totals} - \sum \text{Allocated Payment Amounts}$$

---

## 2. Immutable Invoice Snapshots

When an invoice transitions from `DRAFT` to `ISSUED`, the server captures explicit JSON snapshots:
- **`businessSnapshot`:** Legal Name, Trade Name, GSTIN, Address, State, State Code, Bank Details, Logo URL.
- **`billToSnapshot`:** Display Name, Company Name, Address, State, State Code, GSTIN.
- **`shipToSnapshot`:** Recipient Name, Delivery Address, State, State Code, GSTIN.
- **`items[]`:** Name, HSN/SAC Code, Unit, Rate, Discount, Taxable Amount, GST Rate %, CGST/SGST/IGST Amounts, Cess Amount.

Once `status == "ISSUED"`, these snapshot objects are frozen and read-only.

---

## 3. Server-Side Data Isolation Protocol

Every Mongoose database operation MUST execute tenant filtering based on `session.businessId`:

```typescript
// SECURE PATTERN — Mandatory Business Scoping
export async function getInvoiceById(invoiceId: string, sessionBusinessId: string) {
  const invoice = await InvoiceModel.findOne({
    _id: invoiceId,
    businessId: sessionBusinessId // Tenant boundary explicitly enforced
  });
  if (!invoice) {
    throw new NotFoundError("Invoice not found or access denied");
  }
  return invoice;
}
```

Client-supplied `businessId` parameters are strictly rejected by server middleware.

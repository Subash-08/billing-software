# 29 — Data Integrity & Financial Source of Truth

- **Status:** Approved Integrity Specification (v2.0 - Phase 3.5 Audited)
- **Owner:** Database & Financial Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Establishes the three separate layers of truth, snapshot integrity rules, payment balance calculations, and multi-tenant scoping.

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

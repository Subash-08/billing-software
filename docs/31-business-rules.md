# 31 — Core Business Rules Contract

- **Status:** Approved Business Rules Contract
- **Owner:** Core Domain & Compliance Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies definitive, non-negotiable operational business rules governing numbering, invoice lifecycles, payment allocations, GST calculations, discounts, round-off, and E-Invoicing.

---

## 1. Document Numbering Policy
- **Financial-Year Uniqueness:** Document numbers must be unique within a business and scoped to a financial year (e.g. FY 2025-26).
- **Consecutive Numbering Policy:** Sequences should follow consecutive numbering conventions. However, system architecture MUST NOT make an impossible promise of "gapless" database counters (as draft cancellations, voided entries, or system errors can legally create gaps).
- **Format Constraints:** Max 16 characters for GST tax invoice numbers, composed of alphanumeric characters, slashes (`/`), or hyphens (`-`).
- **Concurrency Safety:** Sequence generation must use atomic database increment locks to prevent duplicate allocations.

---

## 2. Calculation Pipeline & Math Rules
Money calculations follow a strict, deterministic evaluation pipeline:

```
  Gross Item Line Value = Quantity * Unit Rate
          ↓
  Line Discount = Fixed Discount OR (Gross Line Value * Discount %)
          ↓
  Taxable Value = Gross Line Value - Line Discount
          ↓
  GST Calculation = CGST + SGST (Intra-State) OR IGST (Inter-State)
          ↓
  CESS Calculation = Taxable Value * Cess % (if applicable)
          ↓
  Invoice-Level Adjustments (Subtotal = Sum of Item Lines)
          ↓
  Invoice-Level Discount (Percentage or Fixed)
          ↓
  Structured Additional Charges (Packing, Freight, Delivery, Handling, Other)
          ↓
  Round-Off Adjustment (+/- nearest Rupee or configured boundary)
          ↓
  Grand Total = Subtotal - Invoice Discount + Charges + Taxes + Cess + Round-Off
```

---

## 3. Three Layers of Truth & Data Immutability
1. **Master Data Edits:** Editing a Customer address or Product price updates FUTURE invoices only. Issued invoices snapshot customer and catalog data at the time of issue.
2. **GST Setting Edits:** Updating business GSTIN or tax rates applies to FUTURE invoices only.
3. **Payment Ledgers:** Payment records are immutable financial transaction events. Balances are fixed using adjustment/reversal entries, never by overwriting historical payment logs.

---

## 4. Payment Allocation & Customer Outstanding
- **Payment Allocation:** Payments can be allocated across single or multiple invoices (`PaymentAllocation`).
- **Customer Outstanding Derivation:** Customer outstanding is dynamically derived as:
  $$\text{Customer Outstanding} = \sum \text{Invoice Grand Totals} - \sum \text{Allocated Payment Amounts}$$
- **Customer Advance / Credit:** Payments exceeding invoice totals create an unallocated customer credit balance for future invoice settlements.

---

## 5. E-Invoice Compliance Rules
- **Reporting Window Rule (30-Day Restriction):** For taxpayers with AATO $\ge$ ₹10 crore (effective April 1, 2025), IRP reporting is restricted to within 30 days of the invoice date.
- **Cancellation Window (24-Hour Rule):** IRN cancellation on the IRP portal is permitted within 24 hours of generation, provided no linked E-Way bill is active.
- **State Machine Protection:** Once an IRN is generated (`GENERATED`), government-reported fields (IRN, Ack No, Ack Date, Signed QR) are locked and immutable. Amendments must be processed via Credit/Debit Notes.

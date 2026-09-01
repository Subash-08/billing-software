# 31 — Core Business Rules Contract

- **Status:** Approved Business Rules Contract (v4.0 — GST Module Upgrade)
- **Owner:** Core Domain & Compliance Team
- **Last Updated:** 2026-08-31
- **Purpose:** Specifies non-negotiable operational business rules governing numbering, invoice lifecycles, payment allocations, GST calculations (inclusive & exclusive), HSN/SAC validation, Place of Supply, discounts, round-off, and E-Invoicing.

---

## 1. Document Numbering Policy
- **Financial-Year Uniqueness:** Document numbers must be unique within a business and scoped to a financial year (e.g. FY 2025-26).
- **Consecutive Numbering Policy:** Sequences should follow consecutive numbering conventions. However, system architecture MUST NOT make an impossible promise of "gapless" database counters (as draft cancellations, voided entries, or system errors can legally create gaps).
- **Format Constraints:** Max 16 characters for GST tax invoice numbers, composed of alphanumeric characters, slashes (`/`), or hyphens (`-`).
- **Concurrency Safety:** Sequence generation must use atomic database increment locks to prevent duplicate allocations.

---

## 2. Calculation Pipeline & Math Rules

Money calculations follow a strict, deterministic evaluation pipeline:

### Exclusive Pricing Pipeline (Standard)
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

### Inclusive Pricing Pipeline (Residual Method — Invariant 2)
```
  Gross Inclusive Line Value = Quantity * Entered Unit Rate (incl. GST)
          ↓
  Net Inclusive Value = Gross Inclusive Line Value - Line Discount
          ↓
  Taxable Value = Math.round(Net Inclusive Value / (1 + GST Rate / 100))
          ↓
  Embedded GST (Residual) = Net Inclusive Value - Taxable Value
          ↓
  CGST / SGST / IGST Split = Floor/Ceiling distribution of Embedded GST
          ↓
  Line Total = Net Inclusive Value - Commercial Discount
```

---

## 3. Invoice Lifecycle & Immutability (Invariants 5 & 8)

- **DRAFT Status:** Draft invoices are fully editable. Line items, quantities, prices, rates, discounts, HSN/SAC codes, UOMs, customer details, and Place of Supply may be edited. Missing HSN/SAC codes display a warning badge.
- **ISSUED Status:** Transitioning to `ISSUED` triggers the **Issuance Gate** and permanently locks all financial and tax snapshot fields.
- **Locked Fields at ISSUED:** `hsnCode`, `sacCode`, `itemType`, `gstRate`, `cgstRate`, `sgstRate`, `igstRate`, `taxableAmountPaise`, `cgstAmountPaise`, `sgstAmountPaise`, `igstAmountPaise`, `enteredRatePaise`, `isPriceInclusiveOfGst`, `quantity`, `totalAmountPaise`, `grandTotal`, `billFromSnapshot`, `billToSnapshot`, `shipToSnapshot`, `supplyDetails.placeOfSupplyStateCode`, `customerId`.
- **Corrections:** Issued invoices CANNOT be directly edited to change amounts or codes. Corrections MUST be issued via `CREDIT_NOTE` or `DEBIT_NOTE`.

---

## 4. HSN/SAC Classification Rules (Invariants 7 & 9)

- **First-Class Separation:** GOODS use `hsnCode` (4, 6, or 8 digits). SERVICES use `sacCode` (exactly 6 digits).
- **Classificatory Only:** HSN/SAC identifies the item being supplied. It NEVER calculates or determines the GST rate. Tax rates come strictly from `TaxRate` master data.
- **Mandatory at Issuance (Invariant 9):**
  - GOODS item missing `hsnCode` → Blocked at issuance (`HSN_REQUIRED_FOR_GOODS`).
  - SERVICES item missing `sacCode` → Blocked at issuance (`SAC_REQUIRED_FOR_SERVICES`).
  - GOODS item with `sacCode` → Blocked (`SAC_NOT_VALID_FOR_GOODS`).
  - SERVICES item with `hsnCode` → Blocked (`HSN_NOT_VALID_FOR_SERVICES`).
- **Two-Level Validation:**
  1. *Format Validation (Regex):* HSN `/^[0-9]{4,8}$/`, SAC `/^[0-9]{6}$/`. Invalid format blocks save in both DRAFT and ISSUED.
  2. *Master Lookup:* Check `HsnSacMaster`. If not found, display warning in DRAFT (`"Code not found in master — please verify"`), but block issuance.

---

## 5. Three Layers of Truth & Data Immutability

1. **Master Data Edits:** Editing a Customer address or Product price/HSN updates FUTURE invoices only. Issued invoices snapshot customer and catalog data at the time of issue.
2. **GST Setting Edits:** Updating business GSTIN or tax rates applies to FUTURE invoices only.
3. **Payment Ledgers (Invariant 10):** Payment records are immutable financial transaction events. Credit Notes record returns/adjustments and MUST NOT overwrite or delete historical Payment logs. Payment cash refunds are separate Payment transaction events linked by reference.

---

## 6. Payment Allocation & Customer Outstanding

- **Payment Allocation:** Payments can be allocated across single or multiple invoices (`PaymentAllocation`).
- **Customer Outstanding Derivation:** Customer outstanding is dynamically derived as:
  $$\text{Customer Outstanding} = \sum \text{Invoice Grand Totals} - \sum \text{Allocated Payment Amounts}$$
- **Customer Advance / Credit:** Payments exceeding invoice totals create an unallocated customer credit balance for future invoice settlements.

---

## 7. E-Invoice Compliance Rules

- **Reporting Window Rule (30-Day Restriction):** For taxpayers with AATO $\ge$ ₹10 crore (effective April 1, 2025), IRP reporting is restricted to within 30 days of the invoice date.
- **Cancellation Window (24-Hour Rule):** IRN cancellation on the IRP portal is permitted within 24 hours of generation, provided no linked E-Way bill is active.
- **State Machine Protection:** Once an IRN is generated (`GENERATED`), government-reported fields (IRN, Ack No, Ack Date, Signed QR) are locked and immutable. Amendments must be processed via Credit/Debit Notes.


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

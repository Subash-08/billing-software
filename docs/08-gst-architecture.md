# 08 — Centralized GST Architecture

- **Status:** Approved Architecture Specification (v4.0 — GST Module Upgrade)
- **Owner:** Financial & Tax Engineering
- **Last Updated:** 2026-08-31
- **Purpose:** Specifies Indian GST taxation rules, versioned tax rates, HSN/SAC classification, inclusive/exclusive pricing, CGST/SGST/IGST/UTGST/CESS support, place-of-supply decision, central calculation engine interface, and all financial invariants.

---

## 1. Foundational Distinction — Three Separate Concepts

> **Non-negotiable. Confusing these three is the most common GST billing bug.**

| Concept | Answers | Example |
|---|---|---|
| **HSN / SAC** | *What are you selling?* | HSN `847130` = Laptop; SAC `998314` = IT services |
| **TaxRate** | *How much GST applies?* | 18% → CGST 9% + SGST 9% |
| **Place of Supply** | *CGST+SGST or IGST?* | Supplier TN → POS TN = CGST+SGST; Supplier TN → POS KA = IGST |

**Rule:** HSN/SAC MUST NEVER directly calculate GST rate. TaxRate Master is the sole source of truth for tax rates (Invariant 7).

---

## 2. TaxRate Master — Versioned & Effective-Dated

Tax rates are NOT hardcoded. They are versioned, time-bounded master records. Historical invoices must remain at the rate legally applied at transaction time.

```typescript
interface ITaxRateMaster {
  _id: Types.ObjectId;
  name: string;              // e.g. "GST 18%"
  rate: number;              // Total GST % — e.g. 18
  cgstRate: number;          // e.g. 9
  sgstRate: number;          // e.g. 9
  utgstRate: number;         // e.g. 9 (Union Territories)
  igstRate: number;          // e.g. 18
  cessRate?: number;
  cessType?: 'AD_VALOREM' | 'SPECIFIC' | 'BOTH';
  applicableTo: 'GOODS' | 'SERVICES' | 'BOTH';
  effectiveFrom: Date;       // Inclusive — rate valid FROM this date
  effectiveTo?: Date;        // Exclusive — null means currently active
  sourceNotification?: string; // e.g. "CBIC Notification No. 12/2024"
  version: string;           // e.g. "1.0"
  status: 'ACTIVE' | 'INACTIVE';
}
```

**TaxRate Resolution Rule:** `resolveTaxRate(rate, transactionDate)` finds the record where `effectiveFrom <= transactionDate` AND (`effectiveTo IS NULL` OR `effectiveTo > transactionDate`). Resolved rates are snapshotted on the invoice and never re-resolved from the master later.

**Why this matters:**
```
2026-01-01: TaxRate "GST 18%", effectiveFrom=2020-01-01, effectiveTo=null
  → INV-001 issued → snapshot: gstRate=18, cgstRate=9, sgstRate=9

2026-07-01: Government changes rate.
  → New record: "GST 12%", effectiveFrom=2026-07-01
  → INV-001 snapshot is UNCHANGED. Still 18%.
  → INV-002 (new) uses 12%.
```

---

## 3. HSN/SAC Master — Classification Only

```typescript
interface IHsnSacMaster {
  _id: Types.ObjectId;
  code: string;              // "847130" (HSN) | "998314" (SAC)
  type: 'HSN' | 'SAC';      // HSN = GOODS, SAC = SERVICES
  description: string;       // Human-readable — for search UI
  chapter?: string;          // First 2 digits
  heading?: string;          // First 4 digits
  status: 'ACTIVE' | 'INACTIVE';
  effectiveFrom: Date;
  effectiveTo?: Date;
  // REMOVED: defaultGstRate — classificatory only (Invariant 7)
}
```

**Validation:**
- HSN: numeric, 4–8 digits (`/^[0-9]{4,8}$/`). Support 4, 6, and 8-digit levels.
- SAC: numeric, exactly 6 digits (`/^[0-9]{6}$/`).
- **Level 1 (format):** Regex check. Failure blocks save.
- **Level 2 (master lookup):** Not found → warn UI; allow DRAFT save; **block issuance** (Invariant 9).

---

## 4. GST Calculation Pipeline

```
             Product / Service
                    │
                    ▼
          HSN / SAC (classification — does NOT calculate GST)
                    │
                    ▼
           TaxRate Master → resolveTaxRate(rate, transactionDate)
                    │
                    ▼
         GST Rate = 18%  (cgst=9, sgst=9, igst=18)
                    │
                    ▼
          Place of Supply Decision
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   INTRA-STATE           INTER-STATE
   CGST 9% + SGST 9%     IGST 18%
          │                   │
          └─────────┬─────────┘
                    ▼
         Invoice Calculation Engine
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   GST EXCLUSIVE         GST INCLUSIVE
   ₹5,000 entered        ₹5,900 entered
   Taxable = ₹5,000      Taxable = back-calculated
   GST = ₹900            GST = residual
          │                   │
          └─────────┬─────────┘
                    ▼
             ₹5,900 Line Total
```

---

## 5. Place of Supply Decision

```
Supplier State Code
        +
Place of Supply State Code
        ↓
Same state, not UT   →  CGST = gstRate/2,  SGST = gstRate/2
Union Territory (UT) →  CGST = gstRate/2, UTGST = gstRate/2
Different states/UTs →  IGST = gstRate
```

**Rule (Invariant 8):** POS captured at invoice creation is snapshotted. Historical invoices MUST NOT recalculate jurisdiction from current customer address.

---

## 6. Inclusive vs. Exclusive Pricing

### GST Exclusive (standard)
```
Entered Rate          ₹5,000
× Quantity                 1
Gross Line            ₹5,000
− Discount                ₹0
Taxable Value         ₹5,000
CGST @ 9%               ₹450
SGST @ 9%               ₹450
Line Total            ₹5,900
```

### GST Inclusive — Residual Method (Invariant 2)
```
Entered Rate          ₹5,900   ← customer-facing price
× Quantity                 1
Net Inclusive         ₹5,900

Taxable = round(5900 / (1 + 18/100)) = round(5900 / 1.18) = ₹5,000

Embedded GST = Net Inclusive − Taxable
             = ₹5,900 − ₹5,000 = ₹900   ← RESIDUAL (critical)

// INTRA_STATE split from residual:
CGST = floor(900 / 2) = ₹450
SGST = 900 − 450      = ₹450

// Invariant 1: 5,000 + 450 + 450 = 5,900 ✓ EXACT — zero drift
```

**Why residual?** Independently calculating `taxable × 9%` risks ±1 paise. The residual method guarantees exact equality every time.

---

## 7. Tax Component Summary

```
         INTRA_STATE         UNION_TERRITORY       INTER_STATE
CGST     rate/2              rate/2                   0
SGST     rate/2              0                        0
UTGST    0                   rate/2                   0
IGST     0                   0                      rate
CESS     cessRate            cessRate              cessRate
```

---

## 8. All Financial Invariants (Each Must Have Automated Tests)

### Invariant 1 — Line Total Conservation (Zero Drift)
```
taxableAmountPaise + cgstAmountPaise + sgstAmountPaise
  + igstAmountPaise + utgstAmountPaise + cessAmountPaise
= totalAmountPaise
```
Enforced at runtime in `invoice.service.ts` before writing to DB. Throws `INVOICE_INVARIANT_VIOLATION`.

### Invariant 2 — Inclusive Residual Rule
```
embeddedGstPaise = netInclusivePaise − taxableAmountPaise  ← RESIDUAL
NEVER independently recalculate: taxable × rate → paise.
Distribute residual floor/ceiling to CGST/SGST or IGST.
```

### Invariant 3 — Invoice Grand Total Conservation
```
grandTotalPaise = totalTaxablePaise + totalCgstPaise + totalSgstPaise
                + totalIgstPaise + totalUtgstPaise + totalCessPaise
                + nonTaxableChargesPaise − totalCommercialDiscountPaise
                + roundOffPaise
```

### Invariant 4 — Zero GST Rate
```
gstRate === 0 → all GST component amounts = 0
totalAmountPaise = taxableAmountPaise (both inclusive and exclusive)
```

### Invariant 5 — Issued Invoice Full Immutability
```
status = ISSUED → these fields are PERMANENTLY LOCKED:
  hsnCode, sacCode, itemType, gstRate, cgstRate, sgstRate, igstRate,
  taxableAmountPaise, cgstAmountPaise, sgstAmountPaise, igstAmountPaise,
  enteredRatePaise, isPriceInclusiveOfGst, quantity, totalAmountPaise,
  grandTotal, billFromSnapshot, billToSnapshot,
  supplyDetails.placeOfSupplyStateCode, customerId
```

### Invariant 6 — Credit Note Uses Original Invoice Snapshot
```
Credit Note tax data source = originalInvoice.items[i] snapshot
NOT = current ProductModel or ServiceModel at the time of credit note creation.
Only quantity and returned value change.
```

### Invariant 7 — HSN/SAC is Classificatory Only
```
HSN/SAC MUST NEVER directly calculate or determine GST rate.
GST is always resolved via: TaxRate Master → resolveTaxRate(rate, transactionDate).
```

### Invariant 8 — Place of Supply is Snapshotted
```
POS captured at invoice creation determines CGST+SGST vs. IGST.
Historical invoices MUST NOT recalculate jurisdiction from current customer address.
```

### Invariant 9 — HSN/SAC Mandatory at Issuance
```
DRAFT: HSN/SAC may be missing (show ⚠️ warning in UI)
ISSUED:
  GOODS must have hsnCode — block if absent
  SERVICES must have sacCode — block if absent
  GOODS + sacCode = BLOCK ("GOODS items require HSN, not SAC")
  SERVICES + hsnCode = BLOCK ("SERVICE items require SAC, not HSN")
```

### Invariant 10 — Credit Note Must Not Modify Payment Records
```
A Credit Note records a goods/services return.
It MUST NOT overwrite, delete, or reverse a Payment transaction record.
Payment reversal (cash refund) is a SEPARATE immutable Payment transaction.
The two are linked by reference — they are never the same record.
```

---

## 9. Standard Calculation Order (Exclusive Mode)

```
Gross Line = quantity × enteredRatePaise
      ↓
Line Discount = FIXED OR (Gross × discount%)
  REDUCE_TAXABLE_VALUE → reduces taxable base
  COMMERCIAL_ONLY → reduces total after GST
      ↓
Taxable Value = Gross − Tax-Reducing Discount
      ↓
GST = CGST + SGST (intra) OR IGST (inter)
CESS = taxable × cessRate%
      ↓
Invoice-Level Discount (largest-remainder allocation)
      ↓
Additional Charges (taxable or non-taxable)
      ↓
Round-Off (nearest rupee or disabled)
      ↓
Grand Total
```

---

## 10. Tax Override Protocol

Manual tax overrides allowed ONLY under controlled conditions:
- Requires `overrideReason`, `reference`, `timestamp`; triggers immutable `AuditLog` (`TAX_OVERRIDE_APPLIED`).
- UI displays warning: *"Manual Tax Override — Verify GST Treatment Before Issuing"*.
- Override does NOT bypass Invariant 1 (line total conservation still enforced).



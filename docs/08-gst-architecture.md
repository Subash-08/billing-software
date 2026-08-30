# 08 — Centralized GST Architecture

- **Status:** Approved Architecture Specification (v3.0 - Phase 3.6 Audited)
- **Owner:** Financial & Tax Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies Indian GST taxation rules, versioned tax rates, UTGST, CESS support, central calculation engine interface, state/UT code evaluation, tax treatments, and calculation trace.

---

## 1. Versioned Tax Rate & HSN/SAC Master Architecture

Tax rates and HSN/SAC classifications are NOT static hardcoded values. They are versioned, time-bounded configuration master records:

```typescript
interface ITaxRateMaster {
  _id: Types.ObjectId;
  rate: number; // Total GST % (e.g. 18, 40)
  cgstRate: number; // CGST % (e.g. 9)
  sgstRate: number; // SGST % (e.g. 9)
  utgstRate: number; // UTGST % (e.g. 9)
  igstRate: number; // IGST % (e.g. 18)
  cessRate?: number; // Applicable Cess % (e.g. 0, 12)
  cessType?: 'AD_VALOREM' | 'SPECIFIC' | 'BOTH';
  applicableTo: 'GOODS' | 'SERVICES' | 'BOTH';
  effectiveFrom: Date;
  effectiveTo?: Date;
  sourceNotification?: string; // e.g. "CBIC Notification No. 12/2024"
  version: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface IHsnSacMaster {
  _id: Types.ObjectId;
  code: string; // HSN (Goods) or SAC (Services) code
  description: string;
  type: 'HSN' | 'SAC';
  defaultGstRate: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  version: string;
  status: 'ACTIVE' | 'INACTIVE';
}
```

---

## 2. Tax Decision Pipeline & Engine Inputs

```
  Transaction ──► Tax Applicability ──► Tax Treatment ──► Tax Rule ──► Tax Rate ──► Components ──► Calculation Trace
```

### GST Calculation Engine Input Context:
```typescript
interface IGstCalculationInput {
  supplierStateCode: string; // e.g. "27" (Maharashtra) or "35" (Andaman)
  customerStateCode: string; // e.g. "27" or "07" (Delhi)
  taxTreatment: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
  pricingType: 'TAX_EXCLUSIVE' | 'TAX_INCLUSIVE';
  unitPrice: number;
  quantity: number;
  freeQuantity?: number;
  lineDiscountAmount?: number;
  gstRate: number;
  cessRate?: number;
  isUnionTerritory?: boolean; // Intra-UT trigger
}
```

---

## 3. Tax Components: CGST, SGST, UTGST, IGST, CESS

```
                             Compare Location State Codes
                        [supplierStateCode vs customerStateCode]
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
   Intra-State (Same State)     Intra-UT (Union Territory)    Inter-State / Inter-UT
 ┌──────────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐
 │ CGST Rate = GST Rate / 2 │ │ CGST Rate = GST Rate / 2 │ │ IGST Rate = GST Rate     │
 │ SGST Rate = GST Rate / 2 │ │ UTGST Rate = GST Rate / 2│ │ CGST Rate = 0            │
 │ UTGST Rate = 0           │ │ SGST Rate = 0            │ │ SGST / UTGST Rate = 0    │
 │ IGST Rate = 0            │ │ IGST Rate = 0            │ │ Cess Rate = As configured│
 └──────────────────────────┘ └──────────────────────────┘ └──────────────────────────┘
```

### Tax Output Object (`TaxBreakdown`):
```typescript
interface ITaxBreakdown {
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  utgstRate: number;
  utgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalTax: number;
}
```

---

## 4. Complete Calculation Order & Formulas

```
  Gross Line Value = Quantity * Unit Rate
          ↓
  Line Discount = Fixed Discount OR (Gross Line Value * Discount %)
          ↓
  Taxable Value = Gross Line Value - Line Discount
          ↓
  Tax Components = CGST + (SGST OR UTGST) OR IGST
          ↓
  CESS = Taxable Value * (Cess Rate / 100)
          ↓
  Subtotal = Sum of Item Line Net Totals
          ↓
  Invoice Discount (Percentage or Fixed)
          ↓
  Structured Additional Charges (Packing, Freight, Delivery, Handling, Other)
          ↓
  Round-Off Adjustment (+/- nearest Rupee)
          ↓
  Grand Total = Subtotal - Invoice Discount + Charges + Taxes + Cess + Round-Off
```

---

## 5. Tax Override Protocol

Manual tax overrides are allowed ONLY under controlled conditions:
- Requires `overrideReason`, `reference`, `timestamp`, and triggers an immutable `AuditLog` event (`TAX_OVERRIDE_APPLIED`).
- UI displays a prominent warning badge: *"Manual Tax Override — Verify GST Treatment Before Issuing"*.

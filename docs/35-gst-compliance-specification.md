# 35 — GST Compliance Specification

- **Status:** Approved Master GST Domain Specification (v1.0 - Phase 3.6 Audited)
- **Owner:** Core GST & Tax Compliance Architecture
- **Last Updated:** 2026-08-26
- **Purpose:** Authoritative single source of truth for Indian GST domain logic, tax treatments, state/UT branching, versioned tax rates, Cess, IRP adapter contracts, and the 50-scenario test matrix.

---

## 1. Core GST Fundamentals & Decision Flow

GST determination follows a strict, non-ambiguous pipeline. The application MUST NOT immediately ask "What GST Rate?"; it MUST evaluate tax applicability and treatment first:

```
                      Transaction Creation
                               │
                               ▼
                   Tax Applicability Check
            (Is the transaction subject to GST?)
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
         Applicable                         Exempt / Non-GST
              │                                 │
              ▼                                 ▼
     Tax Treatment Selection              Set Tax Treatment
  (TAXABLE, ZERO_RATED, etc.)        (EXEMPT, NIL_RATED, NON_GST)
              │                                 │
              ▼                                 ▼
   Place of Supply Evaluation             Zero Tax Output
(Intra-State vs Inter-State/UT)                 │
              │                                 │
              ▼                                 ▼
    Applicable Tax Rules                  Generate Bill of Supply
 (CGST+SGST / UTGST / IGST)               (or Non-Tax Invoice)
              │
              ▼
     Tax Component Calculation
 (CGST + SGST/UTGST + IGST + Cess)
              │
              ▼
   Calculation Trace Snapshot
```

---

## 2. Tax Treatments vs Tax Rates

Tax treatment and tax rate are distinct architectural concepts:
- **`TAXABLE`:** Standard taxable supply at notified GST rates (e.g. 5%, 12%, 18%, 28%, 40%).
- **`NIL_RATED`:** Goods/services notified with 0% tax rate in official tariff.
- **`EXEMPT`:** Taxable items specifically exempted from GST by notification.
- **`NON_GST`:** Items outside GST ambit (e.g., petroleum crude, alcohol for human consumption).
- **`ZERO_RATED`:** Exports and SEZ supplies (eligible for tax refund or supply under LUT without IGST).

---

## 3. GST Registration Profile & GSTIN Validation

### Registration Types (`registrationType`):
- `REGULAR`: Standard registered GST taxpayer.
- `COMPOSITION`: Composition scheme taxpayer (issues Bill of Supply, no tax collection from buyers).
- `UNREGISTERED`: Consumer / Unregistered business.
- `SEZ`: Special Economic Zone unit/developer.
- `OTHER`: Embassy, UN bodies, Government departments.

### GSTIN Validation & Warning Protocol:
- **Regex Format Check:** `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
- **State Code Check:** First 2 digits MUST match selected state/UT code.
- **Validation Status:** `NOT_VALIDATED`, `VALID`, `INVALID`, `SUSPENDED`, `CANCELLED`, `UNKNOWN`.
- **Name Mismatch Warning:** If external validation returns a Legal/Trade name differing from saved customer details, the UI presents a non-overwriting warning badge: `[Use Verified Details] | [Keep Existing Details]`.

---

## 4. State & Union Territory (UTGST) Rules

Intra-state/UT tax branching is determined by comparing `supplierStateCode` vs `placeOfSupplyStateCode`:

| Transaction Type | Supplier & POS Location | Applied Tax Components |
| :--- | :--- | :--- |
| **Intra-State** | Same State (e.g. Maharashtra to Maharashtra) | `CGST` (50%) + `SGST` (50%) |
| **Intra-UT** | Same Union Territory without Legislature (e.g. Andaman to Andaman, Chandigarh, DADRA, Ladakh, Lakshadweep) | `CGST` (50%) + `UTGST` (50%) |
| **Inter-State / Inter-UT** | Different State / UT (e.g. Maharashtra to Karnataka, Delhi to Chandigarh) | `IGST` (100%) |

---

## 5. Versioned Tax Rate & HSN/SAC Master Data

Tax rates are NOT hardcoded array constants (e.g. `[0, 5, 12, 18, 28]`). The application supports versioned, time-bounded tax rate records to handle government policy changes (such as the 40% GST rate added in Sept 2025):

```typescript
interface ITaxRateMaster {
  _id: Types.ObjectId;
  rate: number; // Total GST %
  cgstRate: number;
  sgstRate: number;
  utgstRate: number;
  igstRate: number;
  cessRate?: number;
  cessType?: 'AD_VALOREM' | 'SPECIFIC' | 'BOTH';
  applicableTo: 'GOODS' | 'SERVICES' | 'BOTH';
  effectiveFrom: Date;
  effectiveTo?: Date;
  sourceNotification?: string;
  version: string;
  status: 'ACTIVE' | 'INACTIVE';
}
```

---

## 6. Document Types: Tax Invoice vs Bill of Supply

| Document Type Code | Name | Applicable Use Case |
| :--- | :--- | :--- |
| `TAX_INVOICE` | GST Tax Invoice | Standard taxable supplies by REGULAR taxpayers. |
| `BILL_OF_SUPPLY` | Bill of Supply | Issued for EXEMPT, NIL_RATED, or COMPOSITION supplies. |
| `CREDIT_NOTE` | Credit Note | Decrease in invoice value / sales returns. |
| `DEBIT_NOTE` | Debit Note | Increase in invoice value / additional charges. |
| `QUOTATION` | Estimate / Quotation | Non-financial pre-sales quote. |
| `DELIVERY_CHALLAN` | Delivery Challan | Goods movement without immediate sale (jobwork, consignment). |

---

## 7. Four Address Entities Snapshot Architecture

For complete auditability and e-invoice compliance, every issued invoice snapshots four distinct location profiles:
1. **Bill From (Seller):** Legal Name, Trade Name, GSTIN, Registered Address, State, State Code.
2. **Dispatch From:** Physical warehouse/factory location from which goods are shipped.
3. **Bill To (Customer):** Buyer Name, GSTIN, Billing Address, State, State Code.
4. **Ship To (Recipient):** Final delivery destination address, State, State Code.

---

## 8. E-Invoice IRP Adapter Architecture

The application decouples invoice business logic from specific IRP providers (e.g., NIC, IRIS, ClearTax) using an **IRP Adapter Pattern**:

```
[Invoice Service] ──► [EInvoice Service] ──► [Payload Builder (Schema 1.1)]
                                                     │
                                                     ▼
                                           [IRP Adapter Interface]
                                                     │
                                 ┌───────────────────┴───────────────────┐
                                 ▼                                       ▼
                       [NIC / IRIS Adapter]                    [Mock / Future Adapter]
```

### Pre-Submission Validation Layer (`EInvoiceComplianceValidator`):
Before initiating API calls, the system validates GSTIN format, POS, HSN/SAC, tax math, mandatory address fields, and the **30-Day Reporting Deadline** (for AATO $\ge$ ₹10 Cr taxpayers effective April 1, 2025).

---

## 9. Comprehensive 50-Scenario GST Test Matrix

The Vitest suite MUST assert clean execution across all 50 scenarios:

1. Intra-State Tax Exclusive CGST + SGST (18%)
2. Inter-State Tax Exclusive IGST (18%)
3. Intra-UT Tax Exclusive CGST + UTGST (18%)
4. Multi-item invoice with different GST rates (5%, 12%, 18%, 28%)
5. Intra-State Tax Inclusive pricing breakdown
6. Inter-State Tax Inclusive pricing breakdown
7. Line-item percentage discount calculation
8. Line-item fixed amount discount calculation
9. Invoice-level discount applied to subtotal
10. Taxable additional packing & freight charges
11. Non-taxable delivery charge
12. Ad-valorem Cess calculation (12%)
13. Zero-Rated export under LUT without tax
14. Exempt goods tax breakdown (0 tax)
15. Nil-rated services tax breakdown (0 tax)
16. Non-GST goods transaction (alcohol/petroleum)
17. Reverse Charge Mechanism (RCM) supplier display
18. Composition taxpayer Bill of Supply generation
19. Export with IGST payment
20. SEZ supply with tax payment
21. SEZ supply without tax payment under LUT
22. Deemed export transaction
23. Bill-To state different from Ship-To state
24. Bill-To state different from Place of Supply
25. Service SAC line item (99xxxx code)
26. Composite supply with principal supply rate
27. Mixed supply with highest tax rate item
28. Credit Note tax reversal math
29. Debit Note additional tax liability math
30. Free quantity line item calculation (10 + 2 free)
31. Historical tax rate snapshot retrieval
32. Effective date boundary tax rate selection
33. HSN master version update handling
34. Invalid GSTIN format rejection
35. GSTIN state code mismatch warning
36. Missing HSN/SAC validation error
37. E-Invoice schema payload generation
38. E-Invoice 30-day reporting restriction expired check
39. E-Invoice 24-hour IRN cancellation window check
40. Partial payment recording balance math
41. Single payment allocated across 3 invoices
42. Excess payment creating customer credit balance
43. Customer advance credit applied to new invoice
44. Cancelled invoice tax liability zeroing
45. Duplicate invoice number sequence prevention
46. Atomic concurrent sequence allocation
47. Advanced tax override reason & audit event log
48. Foreign currency export (USD to INR conversion)
49. Nearest rupee round-off adjustment (+/- 0.45)
50. IgstOnIntra compliance field validation

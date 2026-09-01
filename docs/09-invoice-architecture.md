# 09 — Invoice Architecture

- **Status:** Approved Architecture Specification (v4.0 — GST Module Upgrade)
- **Owner:** Invoicing Core Team
- **Last Updated:** 2026-08-31
- **Purpose:** Specifies invoice data schema, document types, four address snapshots, v8 item snapshot structure (separate HSN/SAC, UOM, inclusive pricing, paise fields), invoice lifecycle state machine, and credit note original-snapshot rule.

---

## 1. Supported Document Types

1. **`TAX_INVOICE`:** Standard GST Tax Invoice for taxable supplies by REGULAR taxpayers.
2. **`BILL_OF_SUPPLY`:** Official Bill of Supply for EXEMPT, NIL_RATED, or COMPOSITION taxpayers (No GST collected).
3. **`CREDIT_NOTE`:** Sales returns / Decrease in invoice tax value.
4. **`DEBIT_NOTE`:** Additional billings / Increase in invoice tax value.
5. **`QUOTATION`:** Pre-sales estimate or quotation.
6. **`DELIVERY_CHALLAN`:** Movement of goods without immediate sale (jobwork, consignment).

---

## 2. Four Address Entities Snapshot Architecture

```
Invoice Document
├── 1. Bill From   (Seller Snapshot: Legal Name, Trade Name, GSTIN, Address, State, State Code)
├── 2. Dispatch From (Warehouse/Factory Physical Location Snapshot)
├── 3. Bill To     (Customer Billing Address Snapshot: Name, GSTIN, Address, State, State Code)
└── 4. Ship To     (Final Delivery Recipient Snapshot: Name, Address, State, State Code)
```

All four address snapshots are captured at ISSUED time and are immutable thereafter (Invariant 5).

---

## 3. Invoice Item Snapshot (v8 — Canonical Schema)

This is the exact historical record of every line item at the moment of issuance. It must never be modified after the invoice is ISSUED.

```typescript
interface IInvoiceItemSnapshot {
  // Identity
  itemId?: ObjectId;
  itemType: 'GOODS' | 'SERVICES';   // Required (Invariant 9)
  name: string;
  description?: string;

  // Classification — SEPARATE FIELDS (Invariant 7)
  hsnCode?: string;   // Populated for GOODS. Mandatory at issuance for GOODS.
  sacCode?: string;   // Populated for SERVICES. Mandatory at issuance for SERVICES.
  // Validation: GOODS must NOT have sacCode. SERVICES must NOT have hsnCode.

  // Quantity + UOM
  quantity: number;
  freeQuantity: number;
  unit: string;       // Display name e.g. "Pieces", "Hours"
  uqc: string;        // GST UQC code e.g. "PCS", "HRS", "NOS", "KGS"

  // Pricing
  enteredRatePaise: number;           // Rate the user entered (in paise)
  isPriceInclusiveOfGst: boolean;     // Whether enteredRate includes GST

  // Discount
  discountType?: 'FIXED' | 'PERCENTAGE';
  discountValueRaw?: number;          // Raw entered value (rupees or %)
  discountAmountPaise: number;        // Computed discount in paise

  // Tax Classification
  taxTreatment: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';

  // Tax Rate Snapshot — exact rates used at THIS transaction (Invariant 5)
  gstRate: number;        // Total % e.g. 18
  cgstRate: number;       // e.g. 9
  sgstRate: number;       // e.g. 9
  igstRate: number;       // e.g. 18 (inter-state) or 0 (intra-state)
  taxRateId: string;      // TaxRate master _id (for audit trail)
  taxRateVersion: string; // TaxRate master version

  // Calculated Amounts — ALL in paise
  taxableAmountPaise: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  utgstAmountPaise: number;
  igstAmountPaise: number;
  cessRate: number;
  cessAmountPaise: number;
  totalAmountPaise: number;
  // Invariant 1: taxable+cgst+sgst+igst+utgst+cess = total (enforced at runtime)
}
```

**Print/PDF label rule:**
- `itemType === 'GOODS'` → column label: **"HSN"**, value: `hsnCode`
- `itemType === 'SERVICES'` → column label: **"SAC"**, value: `sacCode`
- Never print "HSN" for services or "SAC" for goods.

---

## 4. Invoice Header — Complete Field Capability

The invoice data model must support (not all need to be shown — template controls visibility):

```
HEADER
  invoiceNumber, invoiceDate, dueDate, documentType
  originalInvoiceRef (for Credit/Debit Notes)

SELLER (billFromSnapshot)
  businessName, tradeName, gstin, address, state, stateCode, phone, email, bankDetails

BUYER (billToSnapshot)
  customerName, billingAddress, gstin, state, stateCode

SHIP TO (shipToSnapshot)
  recipientName, deliveryAddress, state, stateCode

SUPPLY DETAILS
  placeOfSupplyStateCode, supplyType (B2B/B2C/SEZ/EXPORT)
  taxTreatment, reverseCharge, igstOnIntra, ecommerceOperatorGstin

ITEMS[] — see Section 3

TOTALS
  grossTaxable, totalDiscount, totalTaxable
  totalCgst, totalSgst, totalIgst, totalCess
  otherCharges, roundOff, grandTotal
  amountInWords

TRANSPORT (optional)
  transportMode, vehicleNumber, transporterId, lrNumber, eWayBillNumber

E-INVOICE (future-ready)
  irn, ackNumber, ackDate, signedQrCode

PAYMENT INFO (optional)
  paymentTerms, bankName, accountNumber, ifsc, upiId, qrCode

TERMS
  termsAndConditions, declaration, authorizedSignature
```

---

## 5. Invoice Lifecycle State Machine

```
         ┌──────────────────────────────────────────────┐
         │                   DRAFT                      │
         │  All fields editable                         │
         │  HSN/SAC: allowed missing (show ⚠️ warning)  │
         └────────────────┬─────────────────────────────┘
                          │ issueInvoice() — issuance gate
                          │ Checks: HSN/SAC present, POS present,
                          │         all required fields valid
                          ▼
         ┌──────────────────────────────────────────────┐
         │                  ISSUED                      │
         │  All financial fields LOCKED (Invariant 5)   │
         │  Corrections via Credit Note / Debit Note    │
         └────────┬─────────────────┬───────────────────┘
                  │                 │
                  ▼                 ▼
           CREDIT NOTE        DEBIT NOTE
           (return/decrease)  (additional/increase)
                  │
                  ▼
            CANCELLED (if full credit note = original amount)
```

**DRAFT — can change:** product, qty, price, GST rate, HSN/SAC, UOM, customer, POS, discount, template, notes, payment terms.

**ISSUED — permanently locked:** hsnCode, sacCode, itemType, gstRate, cgstRate, sgstRate, igstRate, taxableAmountPaise, cgstAmountPaise, sgstAmountPaise, igstAmountPaise, enteredRatePaise, isPriceInclusiveOfGst, quantity, totalAmountPaise, grandTotal, all address snapshots, placeOfSupplyStateCode, customerId.

---

## 6. Credit Note — Original Snapshot Rule (Invariant 6)

When a customer returns goods or services against an issued invoice:

```
Original Invoice INV-001
  Item: Laptop
  HSN: 847130
  GST: 18% (CGST 9% + SGST 9%)
  Taxable: ₹5,000 | GST: ₹900 | Total: ₹5,900

6 months later — product master changed: HSN=847141, GST=12%

Customer returns 1 unit.

Credit Note CN-001:
  HSN: 847130         ← from original invoice snapshot (NOT product master)
  GST: 18%            ← from original invoice snapshot (NOT product master)
  Taxable: ₹5,000
  GST: ₹900
  Total: ₹5,900
```

Only `quantity` and `returnedValue` change from the original. Classification and tax rates are inherited from `originalInvoice.items[i]`.

---

## 7. Supply, Transport & Compliance Fields

- **Supply Details:** `placeOfSupplyStateCode`, `supplyType` (`B2B`, `B2C`, `SEZ`, `EXPORT`), `taxTreatment`, `reverseCharge`, `igstOnIntra`, `ecommerceOperatorGstin`.
- **Transport Details:** `transportMode`, `vehicleNumber`, `transporterId`, `lrNumber`, `eWayBillNumber`.
- **Currency Details:** `currency` (default `"INR"`), `baseCurrency`, `exchangeRate`.
- **Item Line Quantities:** `quantity`, `freeQuantity`, `unit`, `uqc` (Official GST UQC code).

---

## 8. Numbering Policy & `DocumentSequence` Strategy

- **Financial-Year Uniqueness:** Document numbers unique within business and scoped to financial year (e.g. FY 2025-26).
- **Consecutive Numbering Policy:** System architecture MUST NOT guarantee technically "gapless" counters (draft cancellations, errors can legally create gaps).
- **Format Constraints:** Max 16 characters for GST tax invoice numbers. Alphanumeric, slashes (`/`), or hyphens (`-`).
- **Concurrency Safety:** Sequence generation uses atomic database increment locks.


# 09 — Invoice Architecture

- **Status:** Approved Architecture Specification (v3.0 - Phase 3.6 Audited)
- **Owner:** Invoicing Core Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies invoice data schema, document types (Tax Invoice vs Bill of Supply), four address snapshots, supply details, transport fields, and calculation traces.

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
├── 1. Bill From (Seller Snapshot: Legal Name, Trade Name, GSTIN, Address, State, POS)
├── 2. Dispatch From (Warehouse/Factory Physical Location Snapshot)
├── 3. Bill To (Customer Billing Address Snapshot: Name, GSTIN, Address, State)
└── 4. Ship To (Final Delivery Recipient Snapshot: Name, Address, State, State Code)
```

---

## 3. Supply, Transport & Compliance Fields

- **Supply Details:** `placeOfSupplyStateCode`, `supplyType` (`B2B`, `B2C`, `SEZ`, `EXPORT`), `taxTreatment` (`TAXABLE`, `EXEMPT`, `NIL_RATED`, `NON_GST`, `ZERO_RATED`), `reverseCharge`, `igstOnIntra`, `ecommerceOperatorGstin`.
- **Transport Details:** `transportMode`, `vehicleNumber`, `transporterId`, `lrNumber`, `eWayBillNumber`.
- **Currency Details:** `currency` (default `"INR"`), `baseCurrency`, `exchangeRate`.
- **Item Line Quantities:** `quantity`, `freeQuantity`, `unit`, `uqc` (Official GST UQC code).
- **Calculation Trace:** Internal snapshot of pricing, tax rates, and calculations for auditability.

---

## 4. Numbering Policy & `DocumentSequence` Strategy

- **Policy:** Consecutive, financial-year aware numbering per document type (`TAX_INVOICE`, `BILL_OF_SUPPLY`, `CREDIT_NOTE`, `DEBIT_NOTE`, `QUOTATION`, `DELIVERY_CHALLAN`). Max 16 characters. Unique constraint: `{ businessId: 1, documentType: 1, prefix: 1, financialYear: 1 }`.
- **Constraint:** System architecture MUST NOT guarantee technically "gapless" database counters.

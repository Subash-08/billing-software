# 27 — Complete Database Schema & Entity Specification

- **Status:** Approved Database Contract (v3.0 - Phase 3.6 Audited)
- **Owner:** Core Database Architecture
- **Last Updated:** 2026-08-26
- **Purpose:** Defines exact entity definitions, schema specifications, field types, enums, references, embedded snapshots, businessId tenant isolation, and unique constraints.

---

## 1. Entity Specification Index

1. `User` (Authentication Identity)
2. `Business` (Single Business Account per User)
3. `Customer` (Customer Master Directory with Embedded Addresses & Contacts)
4. `CustomerAddress` (Embedded Address Value Object Schema)
5. `Product` (Physical Item Catalog Master)
6. `Service` (Billable Service Catalog Master)
7. `Category` (Catalog Classification)
8. `Unit` (Standard Measurement Unit Master with UQC Mapping)
9. `Invoice` (Tax Invoice / Bill of Supply Document with 4 Address Snapshots & Supply Details)
10. `InvoiceItem` (Embedded Line Item Snapshot with Quantity, Free Qty, GST, UTGST & Cess)
11. `Payment` (Financial Collection Transaction Ledger with Allocations)
12. `PaymentAllocation` (Embedded Payment Allocation Value Object)
13. `Receipt` (Generated Collection Document Metadata)
14. `TaxRate` (Versioned GST Tax Bracket Master)
15. `HSNSAC` (Versioned Goods HSN & Services SAC Master Reference)
16. `PaymentMode` (Configurable Payment Settlement Methods)
17. `Attachment` (Cloudinary File Metadata)
18. `AuditLog` (Immutable Compliance Activity Log)
19. `EInvoice` (Isolated Government IRN State & Payload Record)
20. `DocumentSequence` (Per-Business Financial-Year Document Sequence Counter)

---

## 2. Detailed Entity Specifications

### 2.1 Entity: `User`
- **Purpose:** Global authentication account identity.
- **`businessId` Required:** No (Global Identity Record).

| Field Name | Type | Required | Enum / Constrained Values | Default | Purpose / Index |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | — | Generated | Primary Key |
| `email` | `String` | Yes | Lowercase Email | — | Unique Index (`email: 1`) |
| `passwordHash` | `String` | Yes | Argon2 / Scrypt Hash | — | Hashed credentials |

---

### 2.2 Entity: `Business`
- **Purpose:** Single business profile owned by an authenticated user.
- **`businessId` Required:** Self (Tenant root).

| Field Name | Type | Required | Enum / Constrained Values | Default | Purpose / Index |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | — | Generated | Tenant ID (`businessId`) |
| `userId` | `ObjectId` | Yes | Ref: `User` | — | **Unique Index (`userId: 1`) (1:1 Binding)** |
| `legalName` | `String` | Yes | Trimmed String | — | Registered Legal Name |
| `tradeName` | `String` | No | Trimmed String | — | Trade / Brand Name |
| `phone` | `String` | Yes | 10-digit Phone | — | Business Phone |
| `gstRegistrationType`| `String` | Yes | `REGULAR`, `COMPOSITION`, `UNREGISTERED`, `SEZ`, `OTHER` | `REGULAR` | GST Registration |
| `gstin` | `String` | No | 15-char GSTIN Regex | — | GSTIN |
| `gstinStatus` | `String` | Yes | `NOT_VALIDATED`, `VALID`, `INVALID`, `SUSPENDED`, `CANCELLED`, `UNKNOWN` | `NOT_VALIDATED` | Validation status |
| `stateCode` | `String` | Yes | 2-Digit State Code (`01`-`38`) | — | POS state code |

---

### 2.3 Entity: `Customer`
- **Purpose:** Master customer directory containing embedded billing address, shipping addresses, and contacts.
- **Note:** `CustomerAddress` is an embedded value object schema, NOT a separate collection.

| Field Name | Type | Required | Enum / Constrained Values | Default | Purpose / Index |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | — | Generated | Primary Key |
| `businessId` | `ObjectId` | Yes | Ref: `Business` | — | **Index (`businessId: 1, displayName: 1`)** |
| `displayName` | `String` | Yes | Trimmed String | — | Display Name |
| `phone` | `String` | Yes | 10-digit Phone | — | **Index (`businessId: 1, phone: 1`)** |
| `gstTreatment` | `String` | Yes | `REGULAR`, `COMPOSITION`, `UNREGISTERED`, `SEZ`, `OVERSEAS` | `REGULAR` | Tax classification |
| `gstin` | `String` | No | 15-char GSTIN Regex | — | **Index (`businessId: 1, gstin: 1`)** |
| `billingAddress` | `Object` | Yes | Embedded `CustomerAddress` | — | Billing address |
| `shippingAddresses`| `Array` | No | Array of `CustomerAddress` | `[]` | Multiple shipping addresses |
| `creditBalance` | `Number` | Yes | Decimal (>= 0) | `0.00` | Advance payment credit |

---

### 2.4 Entity: `Product` & `Service` Catalog

| Field Name | Type | Required | Enum / Constrained Values | Default | Purpose / Index |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | — | Generated | Primary Key |
| `businessId` | `ObjectId` | Yes | Ref: `Business` | — | **Index (`businessId: 1, name: 1`)** |
| `type` | `String` | Yes | `PRODUCT`, `SERVICE` | — | Discriminator |
| `name` | `String` | Yes | Trimmed String | — | Item name |
| `unit` | `String` | Yes | Ref: `Unit` (e.g. `"Pcs"`) | — | Measurement unit |
| `uqc` | `String` | Yes | Official GST UQC Code | — | Official UQC symbol |
| `sellingPrice` | `Number` | Yes | Decimal (>= 0) | — | Base price |
| `hsnSacCode` | `String` | Yes | HSN or SAC Code | — | HSN/SAC classification |
| `gstRate` | `Number` | Yes | Tax Rate % (e.g. `18`, `40`) | `18` | Applicable GST Rate % |
| `cessRate` | `Number` | No | Cess % (e.g. `12`) | `0` | Applicable Cess % |

---

### 2.5 Entity: `Invoice`

| Field Name | Type | Required | Enum / Constrained Values | Default | Purpose / Index |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | — | Generated | Primary Key |
| `businessId` | `ObjectId` | Yes | Ref: `Business` | — | Tenant ID |
| `invoiceNumber` | `String` | Yes | Format: `PREFIX-YYYY-SEQ` | — | **Unique Index (`businessId: 1, invoiceNumber: 1`)** |
| `documentType` | `String` | Yes | `TAX_INVOICE`, `BILL_OF_SUPPLY`, `CREDIT_NOTE`, `DEBIT_NOTE`, `QUOTATION`, `DELIVERY_CHALLAN` | `TAX_INVOICE` | Document type |
| `supplyType` | `String` | Yes | `B2B`, `B2C`, `SEZ_WITH_PAYMENT`, `SEZ_WITHOUT_PAYMENT`, `EXPORT_WITH_PAYMENT`, `EXPORT_WITHOUT_PAYMENT`, `DEEMED_EXPORT` | `B2B` | GST supply classification |
| `taxTreatment` | `String` | Yes | `TAXABLE`, `NIL_RATED`, `EXEMPT`, `NON_GST`, `ZERO_RATED` | `TAXABLE` | Overall tax treatment |
| `status` | `String` | Yes | `DRAFT`, `VALIDATING`, `READY_TO_ISSUE`, `ISSUED`, `CANCELLED` | `DRAFT` | Status |
| `currency` | `String` | Yes | e.g. `"INR"`, `"USD"` | `"INR"` | Currency code |
| `exchangeRate` | `Number` | Yes | Conversion rate to INR | `1.0` | Base exchange rate |
| `billFromSnapshot` | `Object` | Yes | Embedded Snapshot | — | Seller details |
| `dispatchFromSnapshot`|`Object`| No | Embedded Location Snapshot | — | Warehouse location |
| `billToSnapshot` | `Object` | Yes | Embedded Customer Snapshot | — | Buyer details |
| `shipToSnapshot` | `Object` | No | Embedded Recipient Snapshot | — | Delivery destination |
| `supplyDetails` | `Object` | Yes | Embedded Supply Info | — | POS, RCM, IGSTOnIntra, E-Commerce GSTIN, Transport details |
| `items` | `Array` | Yes | Array of `InvoiceItem` Snapshots| — | Item lines (includes freeQuantity & Cess) |
| `totalCgst` | `Number` | Yes | 2 Decimal Places | `0.00` | Total CGST |
| `totalSgst` | `Number` | Yes | 2 Decimal Places | `0.00` | Total SGST |
| `totalUtgst` | `Number` | Yes | 2 Decimal Places | `0.00` | Total UTGST |
| `totalIgst` | `Number` | Yes | 2 Decimal Places | `0.00` | Total IGST |
| `totalCess` | `Number` | Yes | 2 Decimal Places | `0.00` | Total Cess |
| `roundOff` | `Number` | Yes | 2 Decimal Places | `0.00` | Round-off adjustment |
| `grandTotal` | `Number` | Yes | 2 Decimal Places | `0.00` | Net payable amount |
| `calculationTrace` | `Object` | Yes | Internal Trace Object | — | Calculation breakdown audit trace |

---

### 2.6 Entity: `TaxRate`

| Field Name | Type | Required | Enums / Constraints | Purpose / Index |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Generated | Primary Key |
| `rate` | `Number` | Yes | Total GST % (e.g. `18`, `40`) | **Index (`rate: 1, status: 1`)** |
| `cgstRate` | `Number` | Yes | CGST % | CGST component |
| `sgstRate` | `Number` | Yes | SGST % | SGST component |
| `utgstRate` | `Number` | Yes | UTGST % | UTGST component |
| `igstRate` | `Number` | Yes | IGST % | IGST component |
| `cessRate` | `Number` | No | Cess % | Cess component |
| `effectiveFrom` | `Date` | Yes | ISO Date | Effective start date |
| `effectiveTo` | `Date` | No | ISO Date | Effective end date |

---

### 2.7 Entity: `EInvoice`

| Field Name | Type | Required | Enums / Constraints | Purpose / Index |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Generated | Primary Key |
| `businessId` | `ObjectId` | Yes | Ref: `Business` | Tenant ID |
| `invoiceId` | `ObjectId` | Yes | Ref: `Invoice` (Unique) | **Unique Index (`businessId: 1, invoiceId: 1`)** |
| `status` | `String` | Yes | `NOT_REQUIRED`, `NOT_GENERATED`, `VALIDATING`, `SUBMITTING`, `GENERATED`, `REJECTED`, `CANCELLED` | E-Invoice state machine |
| `irn` | `String` | No | 64-character IRN Hash | **Unique Index (`irn: 1`)** |
| `irpProvider` | `String` | No | e.g. `"NIC"`, `"IRIS"` | Adapter provider |
| `schemaVersion` | `String` | No | e.g. `"1.03"` | Payload schema version |
| `signedQrCode` | `String` | No | Signed QR String | QR Code data |
| `submittedAt` | `Date` | No | ISO Date | Submission timestamp |
| `generatedAt` | `Date` | No | ISO Date | Generation timestamp |
| `cancelledAt` | `Date` | No | ISO Date | Cancellation timestamp |

---

### 2.8 Entity: `DocumentSequence`

| Field Name | Type | Required | Enums / Constraints | Purpose / Index |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Generated | Primary Key |
| `businessId` | `ObjectId` | Yes | Ref: `Business` | Tenant ID |
| `documentType` | `String` | Yes | `TAX_INVOICE`, `BILL_OF_SUPPLY`, `CREDIT_NOTE`, `DEBIT_NOTE`, `QUOTATION`, `DELIVERY_CHALLAN` | Target document type |
| `financialYear` | `String` | Yes | e.g. `"2025-26"` | FY identifier |
| `prefix` | `String` | Yes | String (e.g. `"INV/"`) | Sequence Prefix |
| `nextSeq` | `Number` | Yes | Integer (>= 1) | **Unique Index (`businessId: 1, documentType: 1, prefix: 1, financialYear: 1`)** |

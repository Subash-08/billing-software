# 07 — Domain Model

- **Status:** Approved Architecture Specification
- **Owner:** Domain Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Defines core domain entities, value objects, domain boundaries, and entity relationship diagrams.

---

## 1. Domain Entities Relationship Map

```
┌──────────┐ 1:1  ┌──────────┐ 1:N  ┌──────────┐
│   User   ├─────►│ Business ├─────►│ Customer │
└──────────┘      └────┬─────┘      └────┬─────┘
                       │                 │
                       │ 1:N             │ 1:N
                       ▼                 ▼
                  ┌──────────┐ 1:N  ┌──────────┐
                  │ Catalog  ├─────►│ Invoice  │
                  └──────────┘      └────┬─────┘
                                         │
                                         │ 1:N
                                         ▼
                                    ┌──────────┐
                                    │ Payment  │
                                    └──────────┘
```

---

## 2. Entity Specifications

### 2.1 User (Identity Domain)
- **Role:** Represents authenticated account holder.
- **Attributes:** `id`, `email`, `passwordHash`, `createdAt`.

### 2.2 Business (Profile & Settings Domain)
- **Role:** Central tenant entity owning all operational records.
- **Attributes:** `id`, `userId`, `legalName`, `gstin`, `stateCode`, `bankDetails`, `invoiceSettings`.

### 2.3 Customer (Master Data Domain)
- **Role:** Represents buyers/clients for billing and shipping.
- **Attributes:** `id`, `businessId`, `displayName`, `gstin`, `billingAddress`, `shippingAddress`, `stateCode`.

### 2.4 Product / Service (Catalog Domain)
- **Role:** Deliverables available for sale.
- **Attributes:** `id`, `businessId`, `name`, `type` (`PRODUCT`|`SERVICE`), `hsnSacCode`, `unitPrice`, `gstRate`.

### 2.5 Invoice (Core Financial Domain)
- **Role:** Issued tax bill capturing line items, applied taxes, grand totals, and payment status.
- **Attributes:** `id`, `businessId`, `invoiceNumber`, `status`, `paymentStatus`, `grandTotal`, `customerSnapshot`, `items[]`.

### 2.6 Payment (Financial Settlement Domain)
- **Role:** Individual monetary collection receipt linked to an invoice.
- **Attributes:** `id`, `businessId`, `invoiceId`, `amount`, `paymentDate`, `paymentMode`, `referenceNo`.

---

## 3. Financial Value Objects

- **`Money` Value Object:** Stores numeric values rounded deterministically to 2 decimal places.
- **`StateCode` Value Object:** 2-digit Indian GST state identifier (01 to 38).
- **`TaxBreakdown` Value Object:** Holds computed `{ cgstRate, cgstAmount, sgstRate, sgstAmount, igstRate, igstAmount, totalTax }`.

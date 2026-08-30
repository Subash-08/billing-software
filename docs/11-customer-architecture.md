# 11 — Customer Architecture

- **Status:** Approved Architecture Specification
- **Owner:** Customer & Master Data Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies Customer master record schema, address snapshot rules, state code mapping, and GSTIN formatting.

---

## 1. Customer Schema Specification

```typescript
interface ICustomer {
  _id: Types.ObjectId;
  businessId: Types.ObjectId; // Mandatory tenant isolation key
  displayName: string; // e.g. "Ramesh Trading Co."
  companyName?: string;
  phone: string;
  email?: string;
  
  // Tax & Registration Info
  gstTreatment: 'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION' | 'SEZ' | 'OVERSEAS';
  gstin?: string; // 15-character GSTIN format
  pan?: string;
  placeOfSupplyStateCode: string; // Default state code for POS
  
  // Addresses
  billingAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
  };
  shippingAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
  };
  
  isArchived: boolean; // Soft deletion indicator
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 2. Address & Snapshot Isolation Rule

When creating an invoice:
1. Customer master record is selected.
2. Address details (billing and shipping) and GSTIN are copied into `Invoice.billToSnapshot` and `Invoice.shipToSnapshot`.
3. Edits to `Customer` in the customer directory do NOT affect past `billToSnapshot` values.

---

## 3. GSTIN Validation Rule

- Format: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
- State Code Prefix: First 2 digits of customer GSTIN MUST match the selected state code.

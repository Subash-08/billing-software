# 18 — Audit Log Architecture

- **Status:** Approved Architecture Specification
- **Owner:** Compliance & Security Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies append-only audit logging schema, tracked business events, compliance requirements, and retention rules.

---

## 1. Audit Log Policy

To ensure compliance with Indian business accounting regulations and prevent unauthorized status tampering, all business configuration changes, invoice state transitions, and payment ledger entries automatically append an immutable entry to the `auditLogs` collection.

---

## 2. Tracked Event Categories

| Event Code | Trigger Condition | Logged Payload Summary |
| :--- | :--- | :--- |
| `BUSINESS_CREATED` | New user completes onboarding wizard | Business name, GSTIN, state |
| `BUSINESS_UPDATED` | Profile or bank details edited | Modified field names |
| `GST_SETTINGS_UPDATED` | GSTIN or state code updated | Old GSTIN vs New GSTIN |
| `CUSTOMER_CREATED` | New customer added to directory | Customer ID, Display name |
| `PRODUCT_CREATED` | New catalog item created | SKU, Item type, GST rate |
| `INVOICE_CREATED` | Draft invoice saved | Draft ID, Temporary number |
| `INVOICE_ISSUED` | Invoice transitioned to Issued | Invoice No, Grand Total, Customer |
| `INVOICE_CANCELLED` | Invoice cancelled by user | Reason, Invoice No |
| `PAYMENT_CREATED` | Payment recorded for invoice | Amount, Payment mode, Invoice No |

---

## 3. Schema Structure (`auditLogs`)

```typescript
interface IAuditLog {
  _id: Types.ObjectId;
  businessId: Types.ObjectId; // Tenant isolation key
  userId: Types.ObjectId; // Actor who triggered event
  eventType: string; // Event code from table above
  entityId?: Types.ObjectId; // Target record ID
  entityType?: string; // 'INVOICE' | 'PAYMENT' | 'CUSTOMER' | 'BUSINESS'
  
  details: Record<string, any>; // JSON metadata
  ipAddress?: string;
  userAgent?: string;
  
  createdAt: Date; // Append-only timestamp
}
```

Audit logs are strictly append-only. UPDATE and DELETE operations on `auditLogs` are blocked at the database application layer.

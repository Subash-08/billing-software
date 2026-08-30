# 28 — Domain Events & Application Signals

- **Status:** Approved Domain Specification
- **Owner:** Domain Architecture Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies domain events emitted across application lifecycles, payload definitions, audit log mappings, and future asynchronous handler hooks.

---

## 1. Domain Event Architecture

Domain Events decouple core status mutations (e.g., issuing an invoice, recording a payment) from side effects such as audit logging, PDF generation, email notifications, and reporting recalculations.

```
[Domain Service Action] ──► [Emit Typed Domain Event]
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
[Write to Audit Log]     [Trigger Revalidation]     [Future Async Queue]
(Synchronous)            (revalidatePath)           (Email/WhatsApp/Webhook)
```

---

## 2. Mandatory Domain Event Catalog

### 2.1 `BusinessUpdated`
- **Trigger:** Business updates profile, logo, address, or GSTIN settings.
- **Payload:** `{ businessId: string, userId: string, updatedFields: string[], timestamp: Date }`.
- **Side Effects:** Revalidate settings layout; write audit log entry.

### 2.2 `CustomerCreated`
- **Trigger:** New customer master added.
- **Payload:** `{ businessId: string, customerId: string, displayName: string, gstin?: string, timestamp: Date }`.
- **Side Effects:** Revalidate customer directory cache; write audit log.

### 2.3 `ProductCreated`
- **Trigger:** New product or service added to catalog.
- **Payload:** `{ businessId: string, itemId: string, itemType: 'PRODUCT'|'SERVICE', name: string, rate: number, timestamp: Date }`.
- **Side Effects:** Revalidate product catalog cache.

### 2.4 `InvoiceCreated`
- **Trigger:** New draft invoice saved.
- **Payload:** `{ businessId: string, invoiceId: string, status: 'DRAFT', timestamp: Date }`.
- **Side Effects:** Write audit log entry.

### 2.5 `InvoiceIssued`
- **Trigger:** Invoice transitioned from `DRAFT` to `ISSUED`.
- **Payload:** `{ businessId: string, invoiceId: string, invoiceNumber: string, grandTotal: number, customerId: string, timestamp: Date }`.
- **Side Effects:** Freeze item/address snapshots; emit GSTR-1 update signal; trigger PDF generation; write audit log.

### 2.6 `InvoiceCancelled`
- **Trigger:** Issued invoice status changed to `CANCELLED`.
- **Payload:** `{ businessId: string, invoiceId: string, invoiceNumber: string, reason: string, timestamp: Date }`.
- **Side Effects:** Nullify invoice values in sales reports; write audit log.

### 2.7 `PaymentRecorded`
- **Trigger:** New payment transaction received for an invoice.
- **Payload:** `{ businessId: string, paymentId: string, invoiceId: string, amount: number, paymentMode: string, timestamp: Date }`.
- **Side Effects:** Recalculate invoice `totalPaid`, `outstandingBalance`, and `paymentStatus`; generate receipt; emit `InvoicePaid` signal if outstanding balance equals 0; write audit log.

### 2.8 `InvoicePaid`
- **Trigger:** Invoice outstanding balance reaches 0.00.
- **Payload:** `{ businessId: string, invoiceId: string, invoiceNumber: string, totalPaid: number, timestamp: Date }`.
- **Side Effects:** Transition paymentStatus to `PAID`; lock financial mutations; update customer receivables ledger.

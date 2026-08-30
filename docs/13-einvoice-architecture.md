# 13 — E-Invoice Architecture

- **Status:** Approved Architecture Specification
- **Owner:** Integration & E-Invoice Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies isolated E-Invoice extension architecture, IRP integration payloads, IRN, state transitions, 30-day reporting rules, and applicability checks.

---

## 1. Architectural Isolation Model

The E-Invoice subsystem is designed as an isolated extension layer built on top of the Common Invoice Engine:

```
                  Common Invoice Engine
             (Customer, Items, GST, Totals)
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
     Standard GST Invoice         E-Invoice Module
   (Printable/Downloadable)     (IRP Validation & Payload)
                                         │
                                         ▼
                                IRN / QR Code Snapshot
```

---

## 2. E-Invoice Applicability & Enablement

- **AATO & GSTIN Enablement Check:** Business settings capture AATO (Aggregate Annual Turnover), Entity Type, and IRP Provider API Configuration.
- **UI Advisory Rule:** The system displays advisory guidance ("Based on configured information, e-invoice may apply") requiring official user confirmation. The software DOES NOT make unverified legal applicability claims.

---

## 3. E-Invoice Compliance Rules: Reporting Window vs Cancellation Window

1. **30-Day Reporting Restriction Rule:** Effective April 1, 2025, for taxpayers with AATO $\ge$ ₹10 crore, IRP reporting is restricted to within 30 days of the invoice date. Invoices older than 30 days cannot be uploaded to the IRP.
2. **24-Hour Cancellation Window:** An IRN can only be cancelled on the IRP portal within 24 hours of generation. After 24 hours, cancellations on IRP are blocked, and corrections must be made via Credit Notes.

---

## 4. E-Invoice State Machine & Schema (`einvoices`)

```
 [DRAFT] ──► [VALIDATING] ──► [SUBMITTING] ──► [GENERATED]
                                 │                 │
                                 ▼                 ▼
                            [REJECTED]        [CANCELLED]
```

Once `status == "GENERATED"`, government-reported fields (IRN, Ack No, Ack Date, Signed QR) are locked and immutable.

```typescript
interface IEInvoiceRecord {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  
  status: 'DRAFT' | 'VALIDATING' | 'SUBMITTING' | 'GENERATED' | 'REJECTED' | 'CANCELLED';
  
  irn?: string; // 64-character Invoice Reference Number hash
  acknowledgementNumber?: string;
  acknowledgementDate?: Date;
  signedQrCode?: string;
  signedInvoice?: string;
  
  requestPayload?: Record<string, any>;
  responsePayload?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
  
  submittedAt?: Date;
  generatedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancellationRemarks?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

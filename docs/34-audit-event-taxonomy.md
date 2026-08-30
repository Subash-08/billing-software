# 34 — Audit Event Taxonomy & Financial Ledger Events

> **Application:** Billing Software SaaS  
> **Domain:** Financial Accounting, Invoicing, Settlement, and Audit Trail  
> **Enforcement Level:** MANDATORY PRODUCTION SPECIFICATION

---

## 1. Overview & Event Architectural Contract

Every state transition or financial event within the application generates an immutable **Audit Trail Entry** (`AuditLogModel`) and/or an **Append-Only Financial Ledger Event**.

### Mandatory Event Envelope Properties

All events recorded in `AuditLogModel` or financial ledgers MUST include:

```typescript
interface IAuditEventEnvelope {
  eventId: string;             // UUID v4
  businessId: Types.ObjectId;   // Tenant boundary [Rule 1]
  userId?: Types.ObjectId;     // Session actor (undefined if system automation)
  action: string;              // Canonical event code (e.g. PAYMENT_RECORDED)
  resource: string;            // Entity name (e.g. Payment, Invoice)
  resourceId: string;          // Target document _id
  metadata: Record<string, unknown>; // Event-specific payload
  timestamp: Date;             // UTC ISO Timestamp
}
```

---

## 2. Taxonomy of Domain & Financial Events

| Event Code | Category | Source Collection | Trigger Action | Immutability |
|---|---|---|---|---|
| `INVOICE_CREATED` | Invoice Lifecycle | `Invoice` | User saves DRAFT invoice | Mutable until ISSUED |
| `INVOICE_ISSUED` | Invoice Lifecycle | `Invoice` | Atomic claim `DRAFT` $\to$ `ISSUING` $\to$ `ISSUED` | **IMMUTABLE** |
| `INVOICE_CANCELLED` | Invoice Lifecycle | `Invoice` | Two-phase cancellation protocol | **IMMUTABLE** |
| `PAYMENT_RECORDED` | Settlement Ledger | `Payment` | Cash/bank receipt recorded in transaction | **IMMUTABLE** |
| `PAYMENT_ALLOCATION_CREATED` | Settlement Ledger | `PaymentAllocation` | Invoice payment allocation created | **IMMUTABLE** |
| `PAYMENT_REVERSED` | Settlement Ledger | `PaymentReversal` | Full or partial allocation reversal | **IMMUTABLE** |
| `CUSTOMER_CREDIT_CREATED` | Credit Ledger | `CustomerCreditLedger` | On-account advance payment created | **IMMUTABLE** |
| `CUSTOMER_CREDIT_CONSUMED` | Credit Ledger | `CustomerCreditLedger` | `DEBIT_ALLOCATION` against invoice | **IMMUTABLE** |
| `CUSTOMER_CREDIT_REVERSED` | Credit Ledger | `CustomerCreditLedger` | Credit restoration / reversal | **IMMUTABLE** |
| `RECONCILIATION_REPAIR` | System Audit | `AuditLog` | Materialized projection repaired | **IMMUTABLE** |
| `CRITICAL_LEDGER_INCONSISTENCY` | System Alert | `AuditLog` | Invariant A/B/C violation detected | **IMMUTABLE** |

---

## 3. Event Payload Specifications

### 3.1 `INVOICE_ISSUED`
```json
{
  "action": "INVOICE_ISSUED",
  "resource": "Invoice",
  "resourceId": "60d5ecb8b3f1a8001f3e4a10",
  "metadata": {
    "invoiceNumber": "INV-202627-0001",
    "financialYear": "2026-27",
    "grandTotal": 11800.00
  }
}
```

### 3.2 `PAYMENT_RECORDED`
```json
{
  "action": "PAYMENT_RECORDED",
  "resource": "Payment",
  "resourceId": "60d5ecb8b3f1a8001f3e4b20",
  "metadata": {
    "receiptNumber": "RCP-202627-0001",
    "amountPaise": 1180000,
    "allocatedInvoiceCount": 1,
    "onAccountCreditPaise": 0
  }
}
```

### 3.3 `PAYMENT_REVERSED`
```json
{
  "action": "PAYMENT_REVERSED",
  "resource": "PaymentReversal",
  "resourceId": "60d5ecb8b3f1a8001f3e4c30",
  "metadata": {
    "paymentId": "60d5ecb8b3f1a8001f3e4b20",
    "allocationId": "60d5ecb8b3f1a8001f3e4b21",
    "reversedAmountPaise": 500000,
    "reason": "Customer overpaid by cheque"
  }
}
```

### 3.4 `RECONCILIATION_REPAIR`
```json
{
  "action": "RECONCILIATION_REPAIR",
  "resource": "Invoice",
  "resourceId": "60d5ecb8b3f1a8001f3e4a10",
  "metadata": {
    "field": "paidAmount",
    "before": 10000,
    "after": 11800,
    "repairedAt": "2026-08-27T16:00:00.000Z"
  }
}
```

### 3.5 `CRITICAL_LEDGER_INCONSISTENCY`
```json
{
  "action": "CRITICAL_LEDGER_INCONSISTENCY",
  "resource": "Payment",
  "resourceId": "60d5ecb8b3f1a8001f3e4b20",
  "metadata": {
    "severity": "CRITICAL",
    "code": "CRITICAL_LEDGER_INCONSISTENCY",
    "invariant": "A: payment.amountPaise = SUM(allocations) + onAccountCredit",
    "expected": 1000000,
    "actual": 1200000,
    "affectedIds": ["60d5ecb8b3f1a8001f3e4b20"],
    "detectedAt": "2026-08-27T16:00:00.000Z"
  }
}
```

---

## 4. Preservation & Compliance Principles

1. **Zero Event Erasure**: Audit log entries and financial event records MUST NEVER be updated or deleted via API routes or service layers.
2. **Deterministic Auditability**: Every payment receipt, reversal, and credit allocation can be reconstructed chronologically to verify customer statements and GST ledger filings.
3. **Tenant Boundary Enforcement**: Every audit query filters strictly by `businessId` derived from the session context `[Rule 1]`.

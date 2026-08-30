# 10 — Payment Architecture

- **Status:** Approved Architecture Specification
- **Owner:** Financial Ledger Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies payment transaction ledger, payment allocation model, customer advance/credit balance, configurable payment modes, and derived balances.

---

## 1. Primary Ledger & Payment Allocation Architecture

Payments are independent financial transaction events. A single `Payment` transaction can be allocated across single or multiple invoices using `PaymentAllocation`:

```
Customer Payment (₹20,000)
    │
    ├── Allocation 1 ──► INV-001 (₹10,000) ──► INV-001 Fully Paid
    ├── Allocation 2 ──► INV-002 (₹8,000)  ──► INV-002 Partially Paid
    └── Unallocated ───► Customer Credit Balance (₹2,000 Advance)
```

---

## 2. Payment Transaction Schema & Allocations

```typescript
interface IPaymentAllocation {
  invoiceId: Types.ObjectId;
  amount: number; // Amount applied to this specific invoice
}

interface IPayment {
  _id: Types.ObjectId;
  businessId: Types.ObjectId; // Tenant isolation key
  customerId: Types.ObjectId; // Customer reference
  receiptNumber: string; // e.g. "REC-2026-042"
  
  paymentDate: Date;
  totalAmountReceived: number; // Total money collected
  allocatedAmount: number; // Sum of payment allocations
  unallocatedAmount: number; // Advance / Credit balance created
  
  allocations: IPaymentAllocation[];
  
  paymentModeCode: string; // Ref: PaymentMode (e.g. "CASH", "UPI", "NEFT")
  referenceNumber?: string; // UTR, Cheque No, Transaction ID
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Customer Advance & Credit Balance (Future Ready Hook)

- **Unallocated Payment Handling:** If `totalAmountReceived > allocatedAmount`, the remaining `unallocatedAmount` is assigned to `Customer.creditBalance`.
- **Applying Credits:** Future invoices can be settled using available customer credit balance.

---

## 4. Configurable Payment Modes (`PaymentMode`)

Payment modes are not hardcoded lists. They are configurable per business:
- **Default Master Modes:** Cash, UPI, Google Pay, PhonePe, Bank Transfer (NEFT/RTGS), Cheque, Card, Credit.
- **Business Configuration:** Businesses can enable/disable individual payment modes or define custom collection codes.

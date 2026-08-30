---
name: payment-architecture
description: Payment transaction recording, partial settlement, receipt generation, and derived outstanding calculation.
---

# Payment Architecture Skill

## Purpose
Governs payment collection transactions, partial invoice settlements, and customer balance aggregation.

## Core Rules
- Payments are independent transactions linked to an `Invoice` (`invoiceId`, `businessId`, `amount`, `paymentMode`, `paymentDate`).
- **Outstanding Calculation:** `Invoice Outstanding = Invoice Grand Total - Sum(Payments for Invoice)`.
- **Customer Outstanding:** Derived by summing all unpaid/partially paid invoice balances for that customer.
- Customer balance master record MUST NOT be the primary financial source of truth.

## Forbidden Practices
- NEVER overwrite or hardcode customer balance fields directly without underlying payment records.

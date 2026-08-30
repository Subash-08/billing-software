---
name: invoicing-lifecycle
description: GST Tax Invoice, Non-GST, Cash Bill generation, snapshots, and status transition workflows.
---

# Invoicing Lifecycle Skill

## Purpose
Governs the creation, issuing, snapshotting, and immutability rules of invoices.

## Invoice Types (V1)
1. GST Tax Invoice
2. Non-GST Invoice
3. Cash Bill

## Status Lifecycle
`Draft` → `Issued` → `Partially Paid` / `Paid` / `Cancelled`

## Architectural Rules
- When an invoice transitions from `Draft` to `Issued`, customer details (name, address, GSTIN) and line item snapshots (name, HSN/SAC, rate, price) are permanently frozen.
- Financial fields on `Issued`, `Paid`, or `Partially Paid` invoices cannot be mutated.

## Forbidden Practices
- NEVER allow historical invoice totals to re-calculate when customer master information changes.

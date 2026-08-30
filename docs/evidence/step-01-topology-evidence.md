# Step 1 Evidence Artifact — MongoDB Deployment Topology & Transaction Verification

> **Application:** Billing Software SaaS  
> **Verification Step:** Step 1 — MongoDB Deployment Topology  
> **Date:** 2026-08-27  
> **Verdict:** **PASS**

---

## 1. Environment & Deployment Topology

| Property | Value |
|---|---|
| **MongoDB URI Configured** | `true` |
| **MongoDB Server Version** | `8.0.29` |
| **Deployment Type** | `ReplicaSet` |
| **Replica-Set Name** | `atlas-m4fdsp-shard-0` |
| **Primary Node Available** | `true` |

---

## 2. Multi-Document Transaction Verification

```json
{
  "sessionEstablished": true,
  "multiDocumentTransactionSucceeded": true,
  "committedTestDocumentId": "6a901e92a900c4855f82887a",
  "error": null
}
```

- Multi-document session established via `mongoose.startSession()`.
- Real transactional writes executed across `PaymentModel` and `PaymentAllocationModel` inside `session.withTransaction()`.
- Commit succeeded; documents cleaned up after verification.

---

## 3. Deployed Database Index Catalog Inventory

The following table lists actual deployed indexes queried directly from the live MongoDB database using `db.collection.listIndexes().toArray()`:

| Collection | Index Name | Key Definition | Unique |
|---|---|---|---|
| `payments` | `_id_` | `{ _id: 1 }` | false |
| `payments` | `businessId_1` | `{ businessId: 1 }` | false |
| `payments` | `customerId_1` | `{ customerId: 1 }` | false |
| `payments` | `businessId_1_idempotencyKey_1` | `{ businessId: 1, idempotencyKey: 1 }` | **true** |
| `payments` | `businessId_1_receiptNumber_1` | `{ businessId: 1, receiptNumber: 1 }` | **true** |
| `payments` | `businessId_1_customerId_1_paymentDate_-1` | `{ businessId: 1, customerId: 1, paymentDate: -1 }` | false |
| `payments` | `businessId_1_paymentDate_-1` | `{ businessId: 1, paymentDate: -1 }` | false |
| `paymentallocations` | `_id_` | `{ _id: 1 }` | false |
| `paymentallocations` | `businessId_1_paymentId_1` | `{ businessId: 1, paymentId: 1 }` | false |
| `paymentallocations` | `businessId_1_invoiceId_1` | `{ businessId: 1, invoiceId: 1 }` | false |
| `paymentallocations` | `businessId_1_customerId_1` | `{ businessId: 1, customerId: 1 }` | false |
| `paymentreversals` | `_id_` | `{ _id: 1 }` | false |
| `paymentreversals` | `businessId_1_reversalIdempotencyKey_1` | `{ businessId: 1, reversalIdempotencyKey: 1 }` | **true** |
| `paymentreversals` | `businessId_1_allocationId_1` | `{ businessId: 1, allocationId: 1 }` | false (Multiple reversals allowed) |
| `paymentreversals` | `businessId_1_paymentId_1` | `{ businessId: 1, paymentId: 1 }` | false |
| `customercreditledgers` | `_id_` | `{ _id: 1 }` | false |
| `customercreditledgers` | `businessId_1_customerId_1_createdAt_1` | `{ businessId: 1, customerId: 1, createdAt: 1 }` | false |
| `customercreditledgers` | `businessId_1_sourceCreditId_1` | `{ businessId: 1, sourceCreditId: 1 }` | false |
| `customercreditledgers` | `businessId_1_paymentId_1` | `{ businessId: 1, paymentId: 1 }` | false |
| `invoices` | `_id_` | `{ _id: 1 }` | false |
| `invoices` | `businessId_1_invoiceNumber_1` | `{ businessId: 1, invoiceNumber: 1 }` | **true** |
| `invoices` | `businessId_1_status_1_invoiceDate_-1` | `{ businessId: 1, status: 1, invoiceDate: -1 }` | false |
| `invoices` | `businessId_1_customerId_1_paymentStatus_1` | `{ businessId: 1, customerId: 1, paymentStatus: 1 }` | false |
| `documentsequences` | `businessId_1_documentType_1_prefix_1_financialYear_1` | `{ businessId: 1, documentType: 1, prefix: 1, financialYear: 1 }` | **true** |

---

## 4. Verdict & Execution Gate

- **Step 1 Verdict**: **PASS**
- **Next Gate Unlocked**: **Step 2 — Transaction Failure & Atomic Rollback Verification**.

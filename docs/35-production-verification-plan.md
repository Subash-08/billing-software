# 35 — Production Verification & Operational Hardening Plan

> **Application:** Billing Software SaaS  
> **Domain:** Settlement Engine & Financial Subsystem Verification  
> **Target Environment:** MongoDB Replica Set / MongoDB Atlas

---

## 1. Core Architectural Separation Invariant

All modules and services MUST strictly preserve the separation between authoritative ledger events and derived projections:

```
AUTHORITATIVE APPEND-ONLY LEDGER
  ├── Payment
  ├── PaymentAllocation
  ├── PaymentReversal
  ├── CustomerCreditLedger
  └── AuditLog / Event Envelope
            │
            │ (Derived Projections — Rebuildable via Reconciliation)
            ▼
MATERIALIZED PROJECTIONS
  ├── invoice.paidAmount
  ├── invoice.outstandingBalance
  ├── invoice.paymentStatus
  ├── customer.creditBalance
  └── payment.status
```

> **LAW:** Ordinary application logic MUST NEVER treat materialized projections as authoritative sources of truth. Projections are rebuildable views generated from the append-only ledger.

---

## 2. Production Verification Roadmap

### Verification Step 1 — MongoDB Deployment Topology [PASSED ✅]
- [x] Verify `MONGODB_URI` connects to a MongoDB Replica Set (`rs0`) or MongoDB Atlas cluster.
- [x] Record exact MongoDB server version, deployment topology, and replica-set name in Step 1 Evidence Artifact ([`docs/evidence/step-01-topology-evidence.md`](file:///d:/Subash/project/billing-software/docs/evidence/step-01-topology-evidence.md)).
- [x] Confirm primary node availability and multi-document transaction support (`session.withTransaction()`).
- [x] Verify all required indexes (`{ businessId, idempotencyKey }`, `{ businessId, receiptNumber }`, `{ businessId, reversalIdempotencyKey }`, `{ businessId, customerId }`, `{ businessId, status, dueDate: 1 }`) are active.

### Verification Step 2 — Transaction Failure & Atomic Rollback [PASSED ✅]
- [x] Inject synthetic database write errors mid-transaction (e.g. failure after `Payment` write but before `PaymentAllocation` write).
- [x] Record baseline, uncommitted, and post-rollback states in Step 2 Evidence Artifact ([`docs/evidence/step-02-transaction-rollback-evidence.md`](file:///d:/Subash/project/billing-software/docs/evidence/step-02-transaction-rollback-evidence.md)).
- [x] Assert 100% atomic rollback across `Payment`, `PaymentAllocation`, `CustomerCreditLedger`, and `DocumentSequence`.
- [x] Verify sequence number allocation returns to exact pre-transaction state (`nextSeq = 101`) and subsequent transaction generates `RCP-202627-000101` cleanly.

### Verification Step 3 — Concurrency & Race Recovery [PASSED ✅]
- [x] Issue 100 concurrent `recordPayment` requests against a single invoice outstanding balance over 5 independent rounds (500 attempts).
- [x] Assert 100% over-settlement protection (0 over-settlement incidents, max settled = ₹10,000, 95 expected rejections per round).
- [x] Issue 100 concurrent `consumeCredit` requests against a single source credit over 5 independent rounds (500 attempts).
- [x] Assert 100% credit ceiling protection (0 over-consumption incidents, max consumed = ₹9,000, 97 expected rejections per round).
- [x] Issue simultaneous `recordPayment` vs `cancelInvoice` race over 5 independent rounds.
- [x] Assert exact state protection (0 invalid state incidents, clean single-operation serialization).
- [x] Record empirical metrics in Step 3 Evidence Artifact ([`docs/evidence/step-03-concurrency-evidence.md`](file:///d:/Subash/project/billing-software/docs/evidence/step-03-concurrency-evidence.md)).

### Verification Step 4 — Idempotency & Fingerprint Testing [PASSED ✅]
- [x] Issue duplicate request (`same idempotencyKey + same requestHash`) simultaneously across 5 independent rounds (500 attempts). Assert single payment created, 100/100 return identical payload.
- [x] Issue conflicting payload (`same idempotencyKey + different requestHash`). Assert `IdempotencyConflictError` thrown, zero side-effects.
- [x] Test concurrent duplicate reversal requests (`same reversalIdempotencyKey`). Assert 1 reversal created in DB, invoice restored exactly once.
- [x] Assert E11000 duplicate key race recovery catches unique index collisions gracefully without leaking raw database errors.
- [x] Record empirical metrics in Step 4 Evidence Artifact ([`docs/evidence/step-04-idempotency-evidence.md`](file:///d:/Subash/project/billing-software/docs/evidence/step-04-idempotency-evidence.md)).

### Verification Step 5 — Reconciliation & Critical Alerting [PASSED ✅]
- [x] Deliberately corrupt materialized `invoice.paidAmount` projection in database. Run AUDIT mode. Assert drift detected with 100% ZERO database mutations.
- [x] Run REPAIR mode. Assert `invoice.paidAmount` reconstructed from authoritative allocations. Run REPAIR a 2nd time, assert `noRepairRequired == true` (Idempotence).
- [x] Deliberately corrupt authoritative `PaymentAllocation` ledger. Run REPAIR mode. Assert `CRITICAL_LEDGER_INCONSISTENCY` surfaced, process halted, 0 projection repairs performed.
- [x] Corrupt `customer.creditBalance` projection. Assert AUDIT detects drift, REPAIR reconstructs balance, and Invariant C violation surfaces `CRITICAL` alert.
- [x] Record empirical metrics in Step 5 Evidence Artifact ([`docs/evidence/step-05-reconciliation-evidence.md`](file:///d:/Subash/project/billing-software/docs/evidence/step-05-reconciliation-evidence.md)).

### Verification Step 6 — Security & Multi-Tenant Boundaries [PASSED ✅]
- [x] Attempt cross-business payment lookup (User from Business A requests Payment ID from Business B). Assert `NotFoundError` / `null` with 0 cross-tenant data leaked.
- [x] Record Payment for Customer 2 allocating to Invoice for Customer 1. Assert `PaymentCustomerMismatchError` thrown, transaction aborted, 0 DB mutations.
- [x] Attempt cross-business allocation (Business B payment targeting Business A invoice). Assert `InvoiceNotFoundError` thrown, 0 allocations persisted.
- [x] Attempt unauthorized cross-business reversal (Business B user reversing Business A payment). Assert `InvoiceNotFoundError` thrown, 0 reversals created.
- [x] Execute 1,250 IDOR enumeration probes using random ObjectIds with tenant filter. Assert 0 leaks across 5 collections.
- [x] Record empirical metrics in Step 6 Evidence Artifact ([`docs/evidence/step-06-security-evidence.md`](file:///d:/Subash/project/billing-software/docs/evidence/step-06-security-evidence.md)).

### Verification Step 7 — Performance & Query Benchmarking [PASSED ✅]
- [x] Seed production-scale benchmark dataset (1,000 Invoices, 1,000 Payments, 1,000 Allocations, 1,000 Credit Events).
- [x] Benchmark 9 key database workloads (Invoice Listing, Aging, Payment History, Customer Statement, Credit FIFO, Aggregation, Idempotency, Receipt, Sequence).
- [x] Capture `explain('executionStats')` for all workloads: assert 100% `IXSCAN` on hot paths and `totalDocsExamined / nReturned` ratio $\approx 1.0$.
- [x] Record empirical metrics in Step 7 Evidence Artifact ([`docs/evidence/step-07-performance-evidence.md`](file:///d:/Subash/project/billing-software/docs/evidence/step-07-performance-evidence.md)):
  - Assert zero unexpected `COLLSCAN` collection scans.
  - Verify `winningPlan` uses the intended compound index for aging, FIFO, and statement queries.
  - Assert examined keys and documents are proportional to query selectivity and workload.

### Verification Step 8 — Backup, Restore & Operational Observability [PASSED ✅]
- [x] Verify structured log emission with correlation IDs across 10 key operational events (Payment Success/Failure, Rollback, Idempotency, E11000, Reversal, Repair, CRITICAL Inconsistency, Tenant Violation, Database Error).
- [x] Perform full database snapshot export and restore into isolated target business namespace.
- [x] Audit record counts across all 7 financial collections: assert 100% exact match.
- [x] Compute deterministic SHA-256 checksums of authoritative ledgers: assert 100% hash match between source and restored.
- [x] Audit referential integrity of restored foreign keys and run AUDIT reconciliation on restored database (assert 0 projection drift).
- [x] Record empirical metrics in Step 8 Evidence Artifact ([`docs/evidence/step-08-backup-observability-evidence.md`](file:///d:/Subash/project/billing-software/docs/evidence/step-08-backup-observability-evidence.md)).

---

## 3. Evidence Package Structure (Required for Each Step 1–8)

For each verification step, the team MUST generate a structured **Verification Evidence Artifact**:

```
Step N Evidence Package
├── Environment (Replica Set / Atlas cluster details)
├── Test Scenario & Execution Trigger
├── Workload & Input Payload
├── Expected Invariant
├── Actual Result
├── MongoDB Execution Evidence (explain stats / DB logs)
├── Application Structured Logs
├── Latency & Throughput Metrics (p50 / p95 / p99)
├── Pass / Fail Verdict
└── Evidence Artifact Link
```

---

## 4. Strict Dependency Execution Order

```
Step 1: Replica Set / Atlas Topology [PASSED ✅]
   ↓
Step 2: Transaction Rollback Atomicity [PASSED ✅]
   ↓
Step 3: Concurrency Write-Conflicts [PASSED ✅]
   ↓
Step 4: Idempotency Races & E11000 [PASSED ✅]
   ↓
Step 5: Reconciliation & CRITICAL Alerts [PASSED ✅]
   ↓
Step 6: Multi-Tenant Security Isolation [PASSED ✅]
   ↓
Step 7: Performance Benchmarking (p50/p95/p99 + explain()) [PASSED ✅]
   ↓
Step 8: Backup/Restore & Observability [PASSED ✅]
   ↓
Evidence-Based Production Deployment Readiness Assessment [ACTIVE ⏳]
```

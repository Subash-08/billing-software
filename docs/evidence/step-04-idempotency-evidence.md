# Step 4 Evidence Artifact — Idempotency & E11000 Race Recovery Verification

> **Application:** Billing Software SaaS  
> **Verification Step:** Step 4 — Idempotency & E11000 Race Recovery Verification  
> **Date:** 2026-08-27  
> **Verdict:** **PASS**

---

## 1. Environment Context

| Property | Value |
|---|---|
| **MongoDB Deployment** | MongoDB Atlas Replica Set (`atlas-m4fdsp-shard-0`) |
| **MongoDB Server Version** | `8.0.29` |
| **Total Rounds Executed** | 5 Independent Rounds per Scenario |
| **Total Concurrent Operations** | 1,010 Attempted Transactions |

---

## 2. Test Scenario A — 100 Concurrent Identical Requests (Same Key + Same Hash)

**Workload**: 100 concurrent `recordPayment()` calls with identical `idempotencyKey` and `requestHash` per round  
**Expected Invariant**: Exactly 1 `Payment` document created in DB, 100/100 responses return identical receipt number, 0 duplicate allocations or audit logs.

| Round | Attempted | Deduplicated Client Responses | Payments in DB | Allocations in DB | Audit Logs in DB | Identical Receipt Number | Status |
|---|---|---|---|---|---|---|---|
| Round 1 | 100 | 100 | 1 | 1 | 1 | Yes (`RCP-202627-0000`) | ✅ PASS |
| Round 2 | 100 | 100 | 1 | 1 | 1 | Yes (`RCP-202627-0001`) | ✅ PASS |
| Round 3 | 100 | 100 | 1 | 1 | 1 | Yes (`RCP-202627-0002`) | ✅ PASS |
| Round 4 | 100 | 100 | 1 | 1 | 1 | Yes (`RCP-202627-0003`) | ✅ PASS |
| Round 5 | 100 | 100 | 1 | 1 | 1 | Yes (`RCP-202627-0004`) | ✅ PASS |
| **Total** | **500** | **500** | **5** | **5** | **5** | **100% Consistent** | **✅ PASS** |

> **E11000 Race Recovery Mechanics**: 99 losing concurrent contenders hit MongoDB unique index `{ businessId: 1, idempotencyKey: 1 }` mid-flight. The `recordPayment` service caught `E11000`, aborted the session transaction cleanly, queried the committed payment outside the session, and returned the deduplicated payment payload without leaking database errors.

---

## 3. Test Scenario B — Idempotency Key Reuse Conflict (Same Key + Different Hash)

**Workload**: Initial request with `idempotencyKey: K1` + `requestHash: HASH_A`, followed by conflicting request with `idempotencyKey: K1` + `requestHash: HASH_B` (different payload amount)  
**Expected Invariant**: Request 1 succeeds; Request 2 fails with `IdempotencyConflictError`; DB contains exactly 1 payment.

| Round | Initial Request | Conflicting Request Error Caught | Error Message Verified | Payments in DB | Status |
|---|---|---|---|---|---|
| Round 1 | SUCCESS | `IdempotencyConflictError` | *"Idempotency key '...' was already used with a different payload."* | 1 | ✅ PASS |
| Round 2 | SUCCESS | `IdempotencyConflictError` | *"Idempotency key '...' was already used with a different payload."* | 1 | ✅ PASS |
| Round 3 | SUCCESS | `IdempotencyConflictError` | *"Idempotency key '...' was already used with a different payload."* | 1 | ✅ PASS |
| Round 4 | SUCCESS | `IdempotencyConflictError` | *"Idempotency key '...' was already used with a different payload."* | 1 | ✅ PASS |
| Round 5 | SUCCESS | `IdempotencyConflictError` | *"Idempotency key '...' was already used with a different payload."* | 1 | ✅ PASS |
| **Total** | **5 Succeeded** | **5 Rejected** | **100% Conflict Caught** | **5** | **✅ PASS** |

---

## 4. Test Scenario C — 100 Concurrent Duplicate Reversal Requests (Same Reversal Key)

**Workload**: 100 concurrent `reversePaymentAllocation()` calls with identical `reversalIdempotencyKey` and `reversalRequestHash` per round  
**Expected Invariant**: Exactly 1 `PaymentReversal` document created in DB, 100/100 responses return identical reversal payload, invoice `outstandingBalance` restored exactly once (no over-reversal).

| Round | Attempted | Deduplicated Reversals Returned | Reversals in DB | Final Outstanding (Paise) | Status |
|---|---|---|---|---|---|
| Round 1 | 100 | 100 | 1 | 1,000,000 (₹10,000.00) | ✅ PASS |
| Round 2 | 100 | 100 | 1 | 1,000,000 (₹10,000.00) | ✅ PASS |
| Round 3 | 100 | 100 | 1 | 1,000,000 (₹10,000.00) | ✅ PASS |
| Round 4 | 100 | 100 | 1 | 1,000,000 (₹10,000.00) | ✅ PASS |
| Round 5 | 100 | 100 | 1 | 1,000,000 (₹10,000.00) | ✅ PASS |
| **Total** | **500** | **500** | **5** | **100% Restored Exactly Once** | **✅ PASS** |

---

## 5. Execution Verdict & Next Gate

- **Scenario A Verdict**: **PASS** (Zero duplicate documents across 500 concurrent deduplicated attempts)
- **Scenario B Verdict**: **PASS** (100% payload conflict detection across 5 rounds)
- **Scenario C Verdict**: **PASS** (Zero duplicate reversals across 500 concurrent reversal attempts)
- **Step 4 Verdict**: **PASS**
- **Next Gate Unlocked**: **Step 5 — Reconciliation Engine & CRITICAL Alert Verification**.

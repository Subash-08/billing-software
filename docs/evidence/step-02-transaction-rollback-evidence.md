# Step 2 Evidence Artifact — Transaction Failure & Atomic Rollback Verification

> **Application:** Billing Software SaaS  
> **Verification Step:** Step 2 — Transaction Failure & Atomic Rollback Verification  
> **Date:** 2026-08-27  
> **Verdict:** **PASS**

---

## 1. Environment & Target Business Context

| Property | Value |
|---|---|
| **MongoDB Deployment** | MongoDB Atlas Replica Set (`atlas-m4fdsp-shard-0`) |
| **MongoDB Server Version** | `8.0.29` |
| **Test Business ID** | `6a901f36dfef1a91fe2578d8` |
| **Injected Failure Type** | `SYNTHETIC_DATABASE_FAILURE_AFTER_MUTATIONS_STEP2` |

---

## 2. Empirical Existence & Absence Verification Matrix

The table below records document counts and sequence numbers at three explicit observation phases:

| Entity / State Metric | Baseline (Pre-Txn) | Uncommitted (During Txn, Inside Session) | Post-Rollback (After Abort, Outside Session) | Net State Change |
|---|---|---|---|---|
| `Payment` Documents | **0** | **1** | **0** | **Zero mutation** |
| `PaymentAllocation` Documents | **0** | **1** | **0** | **Zero mutation** |
| `CustomerCreditLedger` Documents | **0** | **1** | **0** | **Zero mutation** |
| `DocumentSequence.nextSeq` | **101** | **102** | **101** | **Zero mutation** |

---

## 3. Subsequent Sequence Continuation Verification

Following the aborted transaction, a valid payment transaction was executed on the same sequence counter:

- **Generated Receipt Number**: `RCP-202627-000101`
- **Updated `nextSeq` State**: `102`
- **Sequence Preservation Verdict**: **PASS** (Zero gap, zero sequence corruption post-rollback).

---

## 4. Execution Verdict & Next Gate

- **Atomic Rollback Verdict**: **PASS**
- **Step 2 Verdict**: **PASS**
- **Next Gate Unlocked**: **Step 3 — Concurrency & Write-Conflict Verification**.

# DISASTER RECOVERY & BACKUP RUNBOOK

**Project:** NIRAMAALAI SaaS Billing Software  
**Document Version:** 1.0.0 (Phase 4B Staging Baseline)  
**Classification:** Operational Security & Reliability Protocol

---

## 1. Executive Summary & Objective

This runbook establishes standard operating procedures for automated database backups, emergency point-in-time recovery (PITR), data verification, and disaster recovery procedures for the NIRAMAALAI SaaS Billing application.

---

## 2. Automated Backup Policy

| Backup Type | Frequency | Retention Period | Storage Location | Encryption |
|---|---|---|---|---|
| **MongoDB Atlas Continuous Snapshots** | Every 6 hours | 35 Days | Atlas Cloud Storage | AES-256 (At-rest) |
| **Point-In-Time Recovery (PITR)** | Continuous oplog streaming | 7 Days | Atlas Cloud Backup | TLS 1.3 + AES-256 |
| **Daily Offline Archival** | 02:00 UTC daily | 90 Days | Encrypted AWS S3 Bucket / Cold Vault | KMS Client-Side Encrypted |

---

## 3. Disaster Recovery Scenario & Restore Procedure

### Scenario: Primary Production Database Corruption or Unintended Data Loss

#### Step 1: Immediate Freeze & Incident Response
1. Trigger Maintenance Mode via environment variable `MAINTENANCE_MODE=true` to suspend incoming API requests.
2. Notify DevOps and Lead Engineers via PagerDuty / OpsGenie.

#### Step 2: Restore MongoDB Atlas Snapshot
1. Log into MongoDB Atlas Security Console.
2. Navigate to **Database Clusters** $\to$ **NIRAMAALAI-Production** $\to$ **Backup**.
3. Select **Restore Snapshot** or **Point-in-Time Restore**.
4. Choose the desired timestamp immediately preceding the incident.
5. Restore to a new isolated target cluster: `NIRAMAALAI-Restored-Staging`.

#### Step 3: Automated Invariant & Snapshot Verification
Run the verification suite against restored target database:

```bash
MONGODB_URI="mongodb+srv://..." npx tsx scripts/verify-phase4b-financial-reconciliation.ts
```

Verify that:
1. `CustomerCreditLedger` Invariant C is non-negative ($\ge 0$).
2. Issued invoices retain Rule 46 frozen address & item snapshots.
3. Database indexes are fully rebuilt (`db.invoices.getIndexes()`).

#### Step 4: DNS / Connection String Switch
1. Update production connection secret `MONGODB_URI` in Vercel / Kubernetes secrets manager.
2. Disable maintenance mode (`MAINTENANCE_MODE=false`).
3. Monitor 4xx/5xx error rates and log streams.

---

## 4. Verification Checklists & Commands

```bash
# 1. Full Vitest Test Suite
npm test

# 2. Production Readiness Gate
npm run verify:production

# 3. Master Product Quality Gate
npx tsx scripts/verify-final-product.ts

# 4. Financial Reconciliation & Concurrency Suite
npx tsx scripts/verify-phase4b-financial-reconciliation.ts
```

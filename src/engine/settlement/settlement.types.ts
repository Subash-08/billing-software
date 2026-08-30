/**
 * Settlement Engine — Types
 * src/engine/settlement/settlement.types.ts
 *
 * Pure domain types. Zero DB, HTTP, or session dependencies.
 */

// ---------------------------------------------------------------------------
// Aging
// ---------------------------------------------------------------------------

export type AgingBucket =
  | 'CURRENT'
  | '1_30_DAYS'
  | '31_60_DAYS'
  | '61_90_DAYS'
  | 'OVER_90_DAYS';

export interface AgingEntry {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;       // YYYY-MM-DD
  dueDate: string | null;    // YYYY-MM-DD or null
  grandTotalPaise: number;
  paidAmountPaise: number;
  outstandingBalancePaise: number;
  bucket: AgingBucket;
  daysOverdue: number;       // 0 if CURRENT
}

export interface AgingReport {
  reportDate: string;        // YYYY-MM-DD Asia/Kolkata
  buckets: Record<AgingBucket, AgingEntry[]>;
  totals: Record<AgingBucket, number>;  // paise totals per bucket
  grandOutstandingPaise: number;
}

// ---------------------------------------------------------------------------
// Payment Status Derivation
// ---------------------------------------------------------------------------

export type PaymentStatus = 'COMPLETED' | 'REVERSED' | 'PARTIALLY_REVERSED';

export interface AllocationActiveState {
  allocationId: string;
  allocatedAmountPaise: number;
  reversedAmountPaise: number;    // SUM of all reversals for this allocationId
  activeAmountPaise: number;      // allocatedAmountPaise - reversedAmountPaise
}

// ---------------------------------------------------------------------------
// Conservation Invariant Check Results
// ---------------------------------------------------------------------------

export interface ConservationCheckResult {
  invariant: 'A' | 'B' | 'C';
  description: string;
  expected: number;  // paise
  actual: number;    // paise
  isViolated: boolean;
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export type ReconciliationMode = 'AUDIT' | 'REPAIR' | 'CRITICAL';

export interface ReconciliationAuditResult {
  mode: 'AUDIT';
  invoicesDrifted: number;
  creditsDrifted: number;
  details: Array<{
    entityType: 'Invoice' | 'CustomerCredit';
    entityId: string;
    field: string;
    expected: number;
    actual: number;
  }>;
}

export interface ReconciliationRepairResult {
  mode: 'REPAIR';
  invoicesRepaired: number;
  creditsRepaired: number;
  noRepairRequired: boolean;
  repairEventIds: string[];
}

export interface CriticalLedgerInconsistency {
  severity: 'CRITICAL';
  code: 'CRITICAL_LEDGER_INCONSISTENCY';
  businessId: string;
  entity: 'Payment' | 'CustomerCreditLedger';
  invariant: string;
  expected: number;    // paise
  actual: number;      // paise
  affectedIds: string[];
  detectedAt: string;  // ISO UTC timestamp
  auditEventId: string;
}

export type ReconciliationResult =
  | ReconciliationAuditResult
  | ReconciliationRepairResult
  | CriticalLedgerInconsistency;

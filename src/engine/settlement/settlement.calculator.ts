/**
 * Settlement Engine — Pure Calculator
 * src/engine/settlement/settlement.calculator.ts
 *
 * Pure functions for settlement math. Zero DB/HTTP/session dependencies.
 * All amounts are in integer paise.
 */

import { PaymentStatus, AllocationActiveState, ConservationCheckResult } from './settlement.types';

// ---------------------------------------------------------------------------
// Payment Status Derivation (Rule 19)
// ---------------------------------------------------------------------------

/**
 * Derives Payment.status from its reversals.
 * Called during payment recording and after reversal — never reads Payment.status directly.
 *
 * @param allocations   Array of { allocatedAmountPaise, reversedAmountPaise }
 */
export function derivePaymentStatus(
  allocations: Array<{ allocatedAmountPaise: number; reversedAmountPaise: number }>
): PaymentStatus {
  if (allocations.length === 0) return 'COMPLETED';

  const totalAllocated = allocations.reduce((s, a) => s + a.allocatedAmountPaise, 0);
  const totalReversed = allocations.reduce((s, a) => s + a.reversedAmountPaise, 0);

  if (totalReversed === 0) return 'COMPLETED';
  if (totalReversed >= totalAllocated) return 'REVERSED';
  return 'PARTIALLY_REVERSED';
}

// ---------------------------------------------------------------------------
// Active Allocation Calculation (Rule 20)
// ---------------------------------------------------------------------------

/**
 * Computes the active (un-reversed) amount for a single allocation.
 * Validates the ceiling invariant: SUM(reversals) <= allocatedAmount.
 */
export function computeActiveAllocation(
  allocatedAmountPaise: number,
  reversedAmountPaise: number
): number {
  if (reversedAmountPaise > allocatedAmountPaise) {
    throw new Error(
      `Reversal sum ${reversedAmountPaise} exceeds allocation ${allocatedAmountPaise}. ` +
      `This indicates a CRITICAL_LEDGER_INCONSISTENCY.`
    );
  }
  return allocatedAmountPaise - reversedAmountPaise;
}

// ---------------------------------------------------------------------------
// Conservation Invariants (Rules 21, A/B/C)
// ---------------------------------------------------------------------------

/**
 * Invariant A: payment.amountPaise = SUM(allocations) + onAccountCreditPaise
 */
export function checkInvariantA(
  paymentAmountPaise: number,
  allocationsSumPaise: number,
  onAccountCreditPaise: number
): ConservationCheckResult {
  const actual = allocationsSumPaise + onAccountCreditPaise;
  return {
    invariant: 'A',
    description: 'Payment Conservation: amount = allocations + credit',
    expected: paymentAmountPaise,
    actual,
    isViolated: actual !== paymentAmountPaise,
  };
}

/**
 * Invariant B: SUM(DEBIT_ALLOCATION for sourceCreditId) <= source.amountPaise
 */
export function checkInvariantB(
  sourceAmountPaise: number,
  totalDebitsForSourcePaise: number
): ConservationCheckResult {
  return {
    invariant: 'B',
    description: 'Credit Source Ceiling: SUM(debits for sourceCreditId) <= source amount',
    expected: sourceAmountPaise,
    actual: totalDebitsForSourcePaise,
    isViolated: totalDebitsForSourcePaise > sourceAmountPaise,
  };
}

/**
 * Invariant C: SUM(CREDIT) - SUM(DEBIT_ALLOCATION) + SUM(REVERSAL) >= 0
 */
export function checkInvariantC(
  totalCreditsPaise: number,
  totalDebitsPaise: number,
  totalReversalsPaise: number
): ConservationCheckResult {
  const actual = totalCreditsPaise - totalDebitsPaise + totalReversalsPaise;
  return {
    invariant: 'C',
    description: 'Aggregate Credit Floor: credit balance >= 0',
    expected: 0,
    actual,
    isViolated: actual < 0,
  };
}

// ---------------------------------------------------------------------------
// Paise Safety Guard (Rule 4 / Rule 15)
// ---------------------------------------------------------------------------

/**
 * Asserts that a value is a non-negative safe integer (suitable for paise storage).
 * Throws if violated.
 */
export function assertSafePaise(value: number, fieldName: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      `${fieldName} must be a non-negative safe integer (paise). Got: ${value}`
    );
  }
}

/**
 * Asserts that a value is a positive safe integer (for payment amounts).
 */
export function assertPositivePaise(value: number, fieldName: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `${fieldName} must be a positive safe integer (paise). Got: ${value}`
    );
  }
}

// ---------------------------------------------------------------------------
// Payment Conservation on Creation (Invariant A)
// ---------------------------------------------------------------------------

/**
 * Validates that a new payment's amounts satisfy Invariant A.
 * Called synchronously before writing any DB documents.
 */
export function validatePaymentConservation(
  amountPaise: number,
  allocationsSumPaise: number,
  onAccountCreditPaise: number
): void {
  const result = checkInvariantA(amountPaise, allocationsSumPaise, onAccountCreditPaise);
  if (result.isViolated) {
    throw new Error(
      `Payment conservation violated: amount=${amountPaise}, ` +
      `allocations=${allocationsSumPaise}, credit=${onAccountCreditPaise}. ` +
      `Expected sum: ${amountPaise}, Actual: ${result.actual}`
    );
  }
}

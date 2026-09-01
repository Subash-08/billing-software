/**
 * Dedicated Invoice Cancellation Decision Policy
 * src/engine/policy/invoice-cancellation.policy.ts
 *
 * Architecture Invariant:
 * Cancellation is a structured domain decision policy evaluating independent facts:
 *   - Invoice Status (DRAFT vs ISSUED vs CANCELLED)
 *   - Active Payment Allocations
 *   - Existing Credit / Debit Notes
 *   - E-Invoice / IRN state
 *
 * Returns a typed decision object rather than performing hardcoded database mutations.
 */

import { IInvoice } from '@/db/models/invoice.model';

export type CancellationDecision =
  | 'ALLOWED'
  | 'REQUIRES_CREDIT_NOTE'
  | 'REQUIRES_EINVOICE_CANCELLATION'
  | 'BLOCKED';

export interface CancellationEvaluationResult {
  decision: CancellationDecision;
  canCancelDirectly: boolean;
  blockers: string[];
  warnings: string[];
  recommendation: string;
}

export class InvoiceCancellationPolicy {
  /**
   * Evaluates whether an invoice can be directly cancelled.
   */
  public static evaluate(
    invoice: IInvoice,
    activePaymentAllocationPaise: number = 0,
    creditNoteCount: number = 0
  ): CancellationEvaluationResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    // 1. Check current invoice status
    if (invoice.status === 'CANCELLED') {
      blockers.push('Invoice is already cancelled.');
      return {
        decision: 'BLOCKED',
        canCancelDirectly: false,
        blockers,
        warnings,
        recommendation: 'This invoice has already been cancelled.',
      };
    }

    // 2. Draft invoices can ALWAYS be cancelled directly
    if (invoice.status === 'DRAFT') {
      return {
        decision: 'ALLOWED',
        canCancelDirectly: true,
        blockers: [],
        warnings: [],
        recommendation: 'Draft invoice can be cancelled or deleted directly.',
      };
    }

    // 3. Issued Invoice checks: Active payments block direct cancellation
    if (activePaymentAllocationPaise > 0 || (invoice.paidAmount && invoice.paidAmount > 0)) {
      const paidRupees = ((activePaymentAllocationPaise || invoice.paidAmount) / 100).toFixed(2);
      blockers.push(`Invoice has active payments recorded (₹${paidRupees}).`);
      return {
        decision: 'REQUIRES_CREDIT_NOTE',
        canCancelDirectly: false,
        blockers,
        warnings,
        recommendation: `Invoice has recorded payments. Issue a Credit Note to refund/adjust ₹${paidRupees} instead of cancelling.`,
      };
    }

    // 4. Issued Invoice checks: Existing Credit Notes
    if (creditNoteCount > 0) {
      warnings.push(`Invoice has ${creditNoteCount} associated Credit Note(s).`);
    }

    // 5. E-Invoice / IRN state check
    if (invoice.einvoiceStatus === 'GENERATED') {
      blockers.push('E-Invoice (IRN) has been generated for this invoice.');
      return {
        decision: 'REQUIRES_EINVOICE_CANCELLATION',
        canCancelDirectly: false,
        blockers,
        warnings,
        recommendation: 'Cancel the IRN on the IRP portal before cancelling this invoice.',
      };
    }

    // 6. Issued invoice with zero payments → Cancellation ALLOWED
    return {
      decision: 'ALLOWED',
      canCancelDirectly: true,
      blockers: [],
      warnings,
      recommendation: 'Issued invoice has no payments recorded and can be cancelled.',
    };
  }
}

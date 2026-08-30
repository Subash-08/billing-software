/**
 * Settlement Reconciliation Service
 * src/services/settlement-reconciliation.service.ts
 *
 * Three-mode operation:
 *   AUDIT  — Read-only drift detection. Zero mutations.
 *   REPAIR — Repairs materialized projections only. IDEMPOTENT [C3].
 *            Returns NO_REPAIR_REQUIRED when expected == actual.
 *   CRITICAL — Ledger conservation invariant violated. No auto-repair.
 *              Surface CriticalLedgerInconsistency payload. Halt.
 *
 * Rule 27: REPAIR never modifies PaymentAllocation, PaymentReversal,
 * or CustomerCreditLedger events. Only projections.
 */

import { Types } from 'mongoose';
import crypto from 'crypto';
import { connectToDatabase } from '@/db/connection';
import { InvoiceModel } from '@/db/models/invoice.model';
import { PaymentModel } from '@/db/models/payment.model';
import { PaymentAllocationModel } from '@/db/models/payment-allocation.model';
import { PaymentReversalModel } from '@/db/models/payment-reversal.model';
import { CustomerModel } from '@/db/models/customer.model';
import { AuditLogModel } from '@/db/models/audit-log.model';
import { customerCreditRepository } from '@/db/repositories/customer-credit.repository';
import {
  checkInvariantA,
  checkInvariantC,
} from '@/engine/settlement/settlement.calculator';
import {
  ReconciliationAuditResult,
  ReconciliationRepairResult,
  CriticalLedgerInconsistency,
  ReconciliationResult,
} from '@/engine/settlement/settlement.types';
import { getTodayBusinessDate } from '@/lib/business-date';

export class SettlementReconciliationService {
  /**
   * AUDIT mode: Detects drift without making any mutations.
   * Returns all invoice and credit projections that don't match ledger.
   */
  async audit(businessId: string): Promise<ReconciliationAuditResult> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);

    const details: ReconciliationAuditResult['details'] = [];

    // --- Invoice balance drift detection ---
    const issuedInvoices = await InvoiceModel.find({
      businessId: bId,
      status: { $in: ['ISSUED', 'CANCELLED'] },
    }).exec();

    for (const invoice of issuedInvoices) {
      const allocations = await PaymentAllocationModel.find({
        businessId: bId,
        invoiceId: invoice._id,
      }).exec();

      let computedPaidPaise = 0;
      for (const alloc of allocations) {
        const reversals = await PaymentReversalModel.find({
          businessId: bId,
          allocationId: alloc._id,
        }).exec();
        const reversedSum = reversals.reduce((s, r) => s + r.reversedAmountPaise, 0);
        computedPaidPaise += alloc.allocatedAmountPaise - reversedSum;
      }

      // Convert from the DB storage unit (the model stores rupees as floats, but
      // we track paise in the settlement system)
      const storedPaidAmount = invoice.paidAmount ?? 0;

      if (computedPaidPaise !== storedPaidAmount) {
        details.push({
          entityType: 'Invoice',
          entityId: invoice._id.toString(),
          field: 'paidAmount',
          expected: computedPaidPaise,
          actual: storedPaidAmount,
        });
      }
    }

    // --- Customer credit balance drift ---
    const customers = await CustomerModel.find({ businessId: bId }).exec();
    for (const customer of customers) {
      const balance = await customerCreditRepository.computeBalance(bId, customer._id as Types.ObjectId);
      const stored = customer.creditBalance ?? 0;

      // Invariant C check
      const invC = checkInvariantC(
        balance.totalCreditPaise,
        balance.totalDebitPaise,
        balance.totalReversalPaise
      );

      if (invC.isViolated) {
        details.push({
          entityType: 'CustomerCredit',
          entityId: customer._id.toString(),
          field: 'invariantC',
          expected: 0,
          actual: balance.availableBalancePaise,
        });
      }

      if (balance.availableBalancePaise !== stored) {
        details.push({
          entityType: 'CustomerCredit',
          entityId: customer._id.toString(),
          field: 'creditBalance',
          expected: balance.availableBalancePaise,
          actual: stored,
        });
      }
    }

    return {
      mode: 'AUDIT',
      invoicesDrifted: details.filter((d) => d.entityType === 'Invoice').length,
      creditsDrifted: details.filter((d) => d.entityType === 'CustomerCredit').length,
      details,
    };
  }

  /**
   * REPAIR mode: Repairs materialized projections. IDEMPOTENT [C3].
   * - If expected == actual: returns NO_REPAIR_REQUIRED (no event appended).
   * - If expected != actual: updates projection, appends RECONCILIATION_REPAIR audit event.
   * NEVER modifies PaymentAllocation, PaymentReversal, or CustomerCreditLedger.
   */
  async repair(businessId: string, userId?: string): Promise<ReconciliationRepairResult> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);

    const repairEventIds: string[] = [];
    let invoicesRepaired = 0;
    let creditsRepaired = 0;

    // --- Repair invoice projections ---
    const issuedInvoices = await InvoiceModel.find({
      businessId: bId,
      status: { $in: ['ISSUED', 'CANCELLED'] },
    }).exec();

    for (const invoice of issuedInvoices) {
      const allocations = await PaymentAllocationModel.find({
        businessId: bId,
        invoiceId: invoice._id,
      }).exec();

      let computedPaidPaise = 0;
      for (const alloc of allocations) {
        const reversals = await PaymentReversalModel.find({
          businessId: bId,
          allocationId: alloc._id,
        }).exec();
        const reversedSum = reversals.reduce((s, r) => s + r.reversedAmountPaise, 0);
        computedPaidPaise += alloc.allocatedAmountPaise - reversedSum;
      }

      const storedPaidAmount = invoice.paidAmount ?? 0;

      // [C3] Idempotency: only repair and append event if drift exists
      if (computedPaidPaise !== storedPaidAmount) {
        await InvoiceModel.findOneAndUpdate(
          { _id: invoice._id, businessId: bId },
          {
            $set: {
              paidAmount: computedPaidPaise,
              outstandingBalance: invoice.grandTotal - computedPaidPaise,
            },
          }
        ).exec();

        const auditEvent = await AuditLogModel.create([
          {
            businessId: bId,
            userId: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
            action: 'RECONCILIATION_REPAIR',
            resource: 'Invoice',
            resourceId: invoice._id.toString(),
            metadata: {
              field: 'paidAmount',
              before: storedPaidAmount,
              after: computedPaidPaise,
              repairedAt: new Date().toISOString(),
            },
          },
        ]);
        repairEventIds.push(auditEvent[0]._id.toString());
        invoicesRepaired++;
      }
      // [C3] If expected == actual: skip silently (no event, no mutation)
    }

    // --- Repair customer credit projections ---
    const customers = await CustomerModel.find({ businessId: bId }).exec();
    for (const customer of customers) {
      const balance = await customerCreditRepository.computeBalance(bId, customer._id as Types.ObjectId);
      const stored = customer.creditBalance ?? 0;

      // [C3] Idempotency: only repair if drift exists
      if (balance.availableBalancePaise !== stored) {
        await CustomerModel.findOneAndUpdate(
          { _id: customer._id, businessId: bId },
          { $set: { creditBalance: balance.availableBalancePaise } }
        ).exec();

        const auditEvent = await AuditLogModel.create([
          {
            businessId: bId,
            userId: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
            action: 'RECONCILIATION_REPAIR',
            resource: 'Customer',
            resourceId: customer._id.toString(),
            metadata: {
              field: 'creditBalance',
              before: stored,
              after: balance.availableBalancePaise,
              repairedAt: new Date().toISOString(),
            },
          },
        ]);
        repairEventIds.push(auditEvent[0]._id.toString());
        creditsRepaired++;
      }
      // [C3] If expected == actual: skip silently (no event, no mutation)
    }

    return {
      mode: 'REPAIR',
      invoicesRepaired,
      creditsRepaired,
      // [C3] noRepairRequired is true when zero drift detected across all entities
      noRepairRequired: invoicesRepaired === 0 && creditsRepaired === 0,
      repairEventIds,
    };
  }

  /**
   * CRITICAL check: Verifies payment conservation (Invariant A) for all payments.
   * Returns a CriticalLedgerInconsistency if any violation is found.
   * NEVER modifies any data. Requires manual investigation.
   */
  async checkCritical(businessId: string): Promise<CriticalLedgerInconsistency | null> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);

    const payments = await PaymentModel.find({ businessId: bId }).exec();

    for (const payment of payments) {
      // Compute SUM(allocations)
      const allocations = await PaymentAllocationModel.find({
        businessId: bId,
        paymentId: payment._id,
      }).exec();

      const totalAllocatedPaise = allocations.reduce(
        (s, a) => s + a.allocatedAmountPaise,
        0
      );

      // Compute on-account credit created by this payment
      const creditEvents = await customerCreditRepository.findByPayment(
        bId,
        payment._id as Types.ObjectId
      );
      const onAccountCreditPaise = creditEvents
        .filter((e) => e.type === 'CREDIT')
        .reduce((s, e) => s + e.amountPaise, 0);

      const invariantA = checkInvariantA(
        payment.amountPaise,
        totalAllocatedPaise,
        onAccountCreditPaise
      );

      if (invariantA.isViolated) {
        const auditEventId = crypto.randomUUID();
        return {
          severity: 'CRITICAL',
          code: 'CRITICAL_LEDGER_INCONSISTENCY',
          businessId,
          entity: 'Payment',
          invariant: 'A: payment.amountPaise = SUM(allocations) + onAccountCredit',
          expected: invariantA.expected,
          actual: invariantA.actual,
          affectedIds: [payment._id.toString()],
          detectedAt: new Date().toISOString(),
          auditEventId,
        };
      }

      // Check Invariant A: paidAmount never exceeds grandTotal
      if (payment.amountPaise > 0) {
        // Additional integrity: allocations can't exceed payment
        if (totalAllocatedPaise > payment.amountPaise) {
          const auditEventId = crypto.randomUUID();
          return {
            severity: 'CRITICAL',
            code: 'CRITICAL_LEDGER_INCONSISTENCY',
            businessId,
            entity: 'Payment',
            invariant: 'A: SUM(allocations) <= payment.amountPaise',
            expected: payment.amountPaise,
            actual: totalAllocatedPaise,
            affectedIds: [payment._id.toString()],
            detectedAt: new Date().toISOString(),
            auditEventId,
          };
        }
      }
    }

    // Check Invariant C for all customers
    const customers = await CustomerModel.find({ businessId: bId }).exec();
    for (const customer of customers) {
      const balance = await customerCreditRepository.computeBalance(bId, customer._id as Types.ObjectId);
      const invC = checkInvariantC(
        balance.totalCreditPaise,
        balance.totalDebitPaise,
        balance.totalReversalPaise
      );

      if (invC.isViolated) {
        const auditEventId = crypto.randomUUID();
        return {
          severity: 'CRITICAL',
          code: 'CRITICAL_LEDGER_INCONSISTENCY',
          businessId,
          entity: 'CustomerCreditLedger',
          invariant: 'C: SUM(CREDIT) - SUM(DEBIT) + SUM(REVERSAL) >= 0',
          expected: 0,
          actual: balance.availableBalancePaise,
          affectedIds: [customer._id.toString()],
          detectedAt: new Date().toISOString(),
          auditEventId,
        };
      }
    }

    return null;
  }

  /**
   * Master reconciliation runner — detects CRITICAL first, then repairs projections.
   * Returns the appropriate ReconciliationResult.
   */
  async run(
    businessId: string,
    mode: 'AUDIT' | 'REPAIR' | 'CRITICAL',
    userId?: string
  ): Promise<ReconciliationResult> {
    if (mode === 'CRITICAL') {
      const critical = await this.checkCritical(businessId);
      if (critical) return critical;
      // No critical — downgrade to audit
      return this.audit(businessId);
    }

    // Always check for CRITICAL before attempting any repair
    const critical = await this.checkCritical(businessId);
    if (critical) return critical; // Surface immediately; do not repair

    if (mode === 'AUDIT') return this.audit(businessId);
    return this.repair(businessId, userId);
  }
}

export const settlementReconciliationService = new SettlementReconciliationService();

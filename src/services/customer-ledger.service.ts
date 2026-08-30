/**
 * Customer Ledger Service
 * src/services/customer-ledger.service.ts
 *
 * Rule 21: CustomerCreditLedger is append-only. Balance is a derived projection.
 * Rule 23: Every DEBIT_ALLOCATION references sourceCreditId with atomic ceiling.
 * [C2]: Concurrent credit consumption is protected by session.withTransaction().
 */

import mongoose, { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { CustomerModel } from '@/db/models/customer.model';
import { CustomerCreditLedgerModel } from '@/db/models/customer-credit-ledger.model';
import { customerCreditRepository, CreditBalance } from '@/db/repositories/customer-credit.repository';
import { InsufficientCreditError } from '@/engine/settlement/settlement.errors';
import { checkInvariantB, checkInvariantC } from '@/engine/settlement/settlement.calculator';

export class CustomerLedgerService {
  /**
   * Returns the live credit balance from the ledger (not from Customer.creditBalance projection).
   * Invariant C validated: throws if result is negative (CRITICAL inconsistency).
   */
  async getLiveBalance(
    businessId: string,
    customerId: string
  ): Promise<CreditBalance> {
    await connectToDatabase();
    const balance = await customerCreditRepository.computeBalance(businessId, customerId);

    if (balance.availableBalancePaise < 0) {
      // Invariant C violation — do not auto-repair, surface for reconciliation
      throw new Error(
        `CRITICAL_LEDGER_INCONSISTENCY: Customer '${customerId}' has negative credit balance ` +
        `${balance.availableBalancePaise} paise. Invariant C violated.`
      );
    }

    return balance;
  }

  /**
   * Consumes on-account credit against an invoice. [C2]
   * Enforces Invariant B (source ceiling) atomically inside a transaction.
   *
   * @param sourceCreditId  _id of the originating CREDIT ledger entry
   * @param consumePaise    Amount to consume in paise
   */
  async consumeCredit(params: {
    businessId: string;
    customerId: string;
    paymentId: string;
    sourceCreditId: string;
    invoiceId: string;
    consumePaise: number;
    notes?: string;
  }): Promise<void> {
    await connectToDatabase();

    const bId = new Types.ObjectId(params.businessId);
    const cId = new Types.ObjectId(params.customerId);
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // === Invariant B: atomic ceiling check [Rule 23 / C2] ===
        const sourceCredit = await customerCreditRepository.findCreditById(
          bId,
          params.sourceCreditId,
          session
        );
        if (!sourceCredit) {
          throw new InsufficientCreditError(params.customerId, params.consumePaise, 0);
        }

        const alreadyConsumed = await customerCreditRepository.sumDebitsForSourceCredit(
          bId,
          new Types.ObjectId(params.sourceCreditId),
          session
        );

        const invariantB = checkInvariantB(
          sourceCredit.amountPaise,
          alreadyConsumed + params.consumePaise
        );

        if (invariantB.isViolated) {
          throw new InsufficientCreditError(
            params.customerId,
            params.consumePaise,
            sourceCredit.amountPaise - alreadyConsumed
          );
        }

        // === Invariant C: aggregate floor check ===
        const balance = await customerCreditRepository.computeBalance(bId, cId, session);
        const invariantC = checkInvariantC(
          balance.totalCreditPaise,
          balance.totalDebitPaise + params.consumePaise,
          balance.totalReversalPaise
        );

        if (invariantC.isViolated) {
          throw new InsufficientCreditError(
            params.customerId,
            params.consumePaise,
            balance.availableBalancePaise
          );
        }

        // === Append DEBIT_ALLOCATION event ===
        await customerCreditRepository.appendEvent(
          {
            businessId: bId,
            customerId: cId,
            paymentId: new Types.ObjectId(params.paymentId),
            type: 'DEBIT_ALLOCATION',
            amountPaise: params.consumePaise,
            sourceCreditId: new Types.ObjectId(params.sourceCreditId),
            invoiceId: new Types.ObjectId(params.invoiceId),
            notes: params.notes,
          },
          session
        );

        // === Update Customer.creditBalance projection ===
        await CustomerModel.findOneAndUpdate(
          { _id: cId, businessId: bId },
          { $inc: { creditBalance: -params.consumePaise } },
          { session }
        ).exec();
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Returns the full credit ledger event history for a customer.
   */
  async getLedgerHistory(
    businessId: string,
    customerId: string
  ): Promise<Array<{
    type: string;
    amountPaise: number;
    invoiceId?: string;
    paymentId: string;
    notes?: string;
    createdAt: Date;
  }>> {
    await connectToDatabase();
    const events = await customerCreditRepository.findByCustomer(businessId, customerId);
    return events.map((e) => ({
      type: e.type,
      amountPaise: e.amountPaise,
      invoiceId: e.invoiceId?.toString(),
      paymentId: e.paymentId.toString(),
      notes: e.notes,
      createdAt: e.createdAt,
    }));
  }
}

export const customerLedgerService = new CustomerLedgerService();

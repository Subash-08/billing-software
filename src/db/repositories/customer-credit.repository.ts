/**
 * CustomerCredit Repository
 * src/db/repositories/customer-credit.repository.ts
 *
 * Rule 21: CustomerCreditLedger is append-only. NEVER modify existing entries.
 * Rule 23: Every DEBIT_ALLOCATION must reference sourceCreditId.
 *
 * Invariant B: SUM(DEBIT_ALLOCATION for sourceCreditId) <= source.amountPaise
 * Invariant C: SUM(CREDIT) - SUM(DEBIT_ALLOCATION) + SUM(REVERSAL) >= 0
 */

import { Types, ClientSession } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import {
  CustomerCreditLedgerModel,
  ICustomerCreditLedger,
  CreditEventType,
} from '@/db/models/customer-credit-ledger.model';

export interface CreditBalance {
  totalCreditPaise: number;
  totalDebitPaise: number;
  totalReversalPaise: number;
  availableBalancePaise: number; // = totalCredit - totalDebit + totalReversal
}

export class CustomerCreditRepository {
  /**
   * Computes the live credit balance for a customer from the ledger.
   * Invariant C: result must be >= 0.
   */
  async computeBalance(
    businessId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<CreditBalance> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId.toString());
    const cId = new Types.ObjectId(customerId.toString());

    const result = await CustomerCreditLedgerModel.aggregate([
      { $match: { businessId: bId, customerId: cId } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amountPaise' },
        },
      },
    ]).session(session ?? null).exec();

    let totalCreditPaise = 0;
    let totalDebitPaise = 0;
    let totalReversalPaise = 0;

    for (const row of result) {
      if (row._id === 'CREDIT') totalCreditPaise = row.total;
      else if (row._id === 'DEBIT_ALLOCATION') totalDebitPaise = row.total;
      else if (row._id === 'REVERSAL') totalReversalPaise = row.total;
    }

    return {
      totalCreditPaise,
      totalDebitPaise,
      totalReversalPaise,
      availableBalancePaise: totalCreditPaise - totalDebitPaise + totalReversalPaise,
    };
  }

  /**
   * Invariant B: Computes SUM(DEBIT_ALLOCATION) for a given sourceCreditId.
   * Used before creating a new DEBIT_ALLOCATION to enforce the ceiling.
   */
  async sumDebitsForSourceCredit(
    businessId: string | Types.ObjectId,
    sourceCreditId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<number> {
    await connectToDatabase();
    const result = await CustomerCreditLedgerModel.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId.toString()),
          sourceCreditId: new Types.ObjectId(sourceCreditId.toString()),
          type: 'DEBIT_ALLOCATION',
        },
      },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]).session(session ?? null).exec();

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Fetches the original CREDIT entry by _id.
   * Required to verify sourceCreditId.amountPaise for ceiling check.
   */
  async findCreditById(
    businessId: string | Types.ObjectId,
    creditId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<ICustomerCreditLedger | null> {
    await connectToDatabase();
    return CustomerCreditLedgerModel.findOne(
      {
        _id: new Types.ObjectId(creditId.toString()),
        businessId: new Types.ObjectId(businessId.toString()),
        type: 'CREDIT',
      },
      null,
      session ? { session } : {}
    ).exec();
  }

  /**
   * Appends a new ledger event. NEVER modifies existing events.
   */
  async appendEvent(
    data: Pick<
      ICustomerCreditLedger,
      'businessId' | 'customerId' | 'type' | 'amountPaise'
    > & {
      paymentId?: Types.ObjectId;
      sourceCreditId?: Types.ObjectId;
      invoiceId?: Types.ObjectId;
      notes?: string;
    },
    session?: ClientSession
  ): Promise<ICustomerCreditLedger> {
    await connectToDatabase();
    const [entry] = await CustomerCreditLedgerModel.create([data], session ? { session } : {});
    return entry;
  }

  /**
   * Lists ledger events for a customer in chronological order.
   */
  async findByCustomer(
    businessId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<ICustomerCreditLedger[]> {
    await connectToDatabase();
    return CustomerCreditLedgerModel.find(
      {
        businessId: new Types.ObjectId(businessId.toString()),
        customerId: new Types.ObjectId(customerId.toString()),
      },
      null,
      session ? { session } : {}
    ).sort({ createdAt: 1 }).exec();
  }

  /**
   * Finds credit events for a payment (used for reversal eligibility checks).
   */
  async findByPayment(
    businessId: string | Types.ObjectId,
    paymentId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<ICustomerCreditLedger[]> {
    await connectToDatabase();
    return CustomerCreditLedgerModel.find(
      {
        businessId: new Types.ObjectId(businessId.toString()),
        paymentId: new Types.ObjectId(paymentId.toString()),
      },
      null,
      session ? { session } : {}
    ).exec();
  }
}

export const customerCreditRepository = new CustomerCreditRepository();

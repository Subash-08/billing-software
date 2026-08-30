/**
 * PaymentReversal Repository
 * src/db/repositories/payment-reversal.repository.ts
 *
 * Rule 20 / A3: Multiple reversals per allocation allowed.
 * Unique index on { businessId, reversalIdempotencyKey }.
 */

import { Types, ClientSession } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { PaymentReversalModel, IPaymentReversal } from '@/db/models/payment-reversal.model';

export class PaymentReversalRepository {
  /**
   * Finds an existing reversal by idempotency key.
   * Returns null if not found.
   */
  async findByIdempotencyKey(
    businessId: string | Types.ObjectId,
    reversalIdempotencyKey: string,
    session?: ClientSession
  ): Promise<IPaymentReversal | null> {
    await connectToDatabase();
    return PaymentReversalModel.findOne(
      {
        businessId: new Types.ObjectId(businessId.toString()),
        reversalIdempotencyKey,
      },
      null,
      session ? { session } : {}
    ).exec();
  }

  /**
   * Returns the SUM of reversedAmountPaise for a given allocationId.
   * Used to enforce the per-allocation reversal ceiling.
   */
  async sumReversedForAllocation(params: {
    businessId: string | Types.ObjectId;
    allocationId: string | Types.ObjectId;
    session?: ClientSession;
  }): Promise<number> {
    await connectToDatabase();
    const result = await PaymentReversalModel.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(params.businessId.toString()),
          allocationId: new Types.ObjectId(params.allocationId.toString()),
        },
      },
      { $group: { _id: null, total: { $sum: '$reversedAmountPaise' } } },
    ]).session(params.session ?? null).exec();

    return result.length > 0 ? result[0].total : 0;
  }

  async create(
    data: Pick<
      IPaymentReversal,
      | 'businessId'
      | 'paymentId'
      | 'allocationId'
      | 'reversedAmountPaise'
      | 'reversalIdempotencyKey'
      | 'reversalRequestHash'
      | 'reason'
      | 'userId'
    >,
    session?: ClientSession
  ): Promise<IPaymentReversal> {
    await connectToDatabase();
    const [reversal] = await PaymentReversalModel.create([data], session ? { session } : {});
    return reversal;
  }

  async findByPayment(
    businessId: string | Types.ObjectId,
    paymentId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IPaymentReversal[]> {
    await connectToDatabase();
    return PaymentReversalModel.find(
      {
        businessId: new Types.ObjectId(businessId.toString()),
        paymentId: new Types.ObjectId(paymentId.toString()),
      },
      null,
      session ? { session } : {}
    ).exec();
  }
}

export const paymentReversalRepository = new PaymentReversalRepository();

/**
 * PaymentAllocation Repository
 * src/db/repositories/payment-allocation.repository.ts
 *
 * Rule C1: countActiveAllocations() is the AUTHORITATIVE eligibility check
 * for invoice cancellation. It queries the ledger, not the invoice projection.
 */

import { Types, ClientSession } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { PaymentAllocationModel, IPaymentAllocation } from '@/db/models/payment-allocation.model';
import { PaymentReversalModel } from '@/db/models/payment-reversal.model';

export interface ActiveAllocationSummary {
  allocationId: string;
  allocatedAmountPaise: number;
  reversedAmountPaise: number;
  activeAmountPaise: number;
}

export class PaymentAllocationRepository {
  /**
   * [C1] Authoritative check: count active (un-fully-reversed) PaymentAllocation
   * documents for an invoice. Used as Phase 1 of the two-phase cancellation protocol.
   *
   * "Active" means: the allocation's allocatedAmountPaise > SUM(reversals for that allocationId).
   */
  async countActiveAllocations(params: {
    invoiceId: string | Types.ObjectId;
    businessId: string | Types.ObjectId;
    session?: ClientSession;
  }): Promise<number> {
    await connectToDatabase();
    const invoiceId = new Types.ObjectId(params.invoiceId.toString());
    const businessId = new Types.ObjectId(params.businessId.toString());

    // Fetch all allocations for this invoice
    const allocations = await PaymentAllocationModel.find(
      { invoiceId, businessId },
      { _id: 1, allocatedAmountPaise: 1 },
      params.session ? { session: params.session } : {}
    ).exec();

    if (allocations.length === 0) return 0;

    // For each allocation, compute the total reversed amount
    let activeCount = 0;
    for (const alloc of allocations) {
      const reversals = await PaymentReversalModel.find(
        { allocationId: alloc._id, businessId },
        { reversedAmountPaise: 1 },
        params.session ? { session: params.session } : {}
      ).exec();

      const reversedSum = reversals.reduce((s, r) => s + r.reversedAmountPaise, 0);
      if (reversedSum < alloc.allocatedAmountPaise) {
        activeCount++;
      }
    }

    return activeCount;
  }

  /**
   * Fetches all allocations for a payment with their reversal totals.
   */
  async findActiveStatesForPayment(params: {
    paymentId: string | Types.ObjectId;
    businessId: string | Types.ObjectId;
    session?: ClientSession;
  }): Promise<ActiveAllocationSummary[]> {
    await connectToDatabase();
    const paymentId = new Types.ObjectId(params.paymentId.toString());
    const businessId = new Types.ObjectId(params.businessId.toString());

    const allocations = await PaymentAllocationModel.find(
      { paymentId, businessId },
      null,
      params.session ? { session: params.session } : {}
    ).exec();

    const results: ActiveAllocationSummary[] = [];
    for (const alloc of allocations) {
      const reversals = await PaymentReversalModel.find(
        { allocationId: alloc._id, businessId },
        { reversedAmountPaise: 1 },
        params.session ? { session: params.session } : {}
      ).exec();

      const reversedSum = reversals.reduce((s, r) => s + r.reversedAmountPaise, 0);
      results.push({
        allocationId: alloc._id.toString(),
        allocatedAmountPaise: alloc.allocatedAmountPaise,
        reversedAmountPaise: reversedSum,
        activeAmountPaise: alloc.allocatedAmountPaise - reversedSum,
      });
    }

    return results;
  }

  async create(
    data: Pick<
      IPaymentAllocation,
      'businessId' | 'paymentId' | 'invoiceId' | 'customerId' | 'allocatedAmountPaise'
    >,
    session?: ClientSession
  ): Promise<IPaymentAllocation> {
    await connectToDatabase();
    const [allocation] = await PaymentAllocationModel.create([data], session ? { session } : {});
    return allocation;
  }

  async findByInvoice(
    businessId: string | Types.ObjectId,
    invoiceId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IPaymentAllocation[]> {
    await connectToDatabase();
    return PaymentAllocationModel.find(
      {
        businessId: new Types.ObjectId(businessId.toString()),
        invoiceId: new Types.ObjectId(invoiceId.toString()),
      },
      null,
      session ? { session } : {}
    ).exec();
  }
}

export const paymentAllocationRepository = new PaymentAllocationRepository();

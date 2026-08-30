/**
 * GET /api/payments/[id] — Fetch payment detail with allocations and reversals
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { paymentService } from '@/services/payment.service';
import { PaymentAllocationModel } from '@/db/models/payment-allocation.model';
import { PaymentReversalModel } from '@/db/models/payment-reversal.model';
import { ApplicationError } from '@/lib/errors';
import { Types } from 'mongoose';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { businessId } = await requireAuthenticatedBusiness();
    const payment = await paymentService.getPayment(businessId, id);

    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    // Enrich with allocations and reversals
    const bId = new Types.ObjectId(businessId);
    const allocations = await PaymentAllocationModel.find({
      businessId: bId,
      paymentId: payment._id,
    }).exec();

    const enrichedAllocations = await Promise.all(
      allocations.map(async (alloc) => {
        const reversals = await PaymentReversalModel.find({
          businessId: bId,
          allocationId: alloc._id,
        }).exec();
        const reversedSum = reversals.reduce((s, r) => s + r.reversedAmountPaise, 0);
        return {
          allocationId: alloc._id.toString(),
          invoiceId: alloc.invoiceId.toString(),
          allocatedAmountPaise: alloc.allocatedAmountPaise,
          reversedAmountPaise: reversedSum,
          activeAmountPaise: alloc.allocatedAmountPaise - reversedSum,
          reversals: reversals.map((r) => ({
            reversalId: r._id.toString(),
            reversedAmountPaise: r.reversedAmountPaise,
            reason: r.reason,
            createdAt: r.createdAt,
          })),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        payment,
        allocations: enrichedAllocations,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch payment';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

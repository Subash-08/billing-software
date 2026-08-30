/**
 * POST /api/payments/[id]/reverse — Reverse a payment allocation [A3]
 *
 * Idempotent: same reversalIdempotencyKey + same reversalRequestHash → returns existing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { paymentService } from '@/services/payment.service';
import { ReversePaymentSchema } from '@/validations/payment.schema';
import { ApplicationError } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { businessId, user } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const parsed = ReversePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await paymentService.reversePaymentAllocation(
      businessId,
      user._id.toString(),
      id,
      parsed.data
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    const msg = error instanceof Error ? error.message : 'Failed to reverse payment';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

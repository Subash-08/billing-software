/**
 * POST /api/payments — Record a new payment
 * GET  /api/payments — List payments with optional filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { paymentService } from '@/services/payment.service';
import { RecordPaymentSchema } from '@/validations/payment.schema';
import { ApplicationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);

    const customerId = searchParams.get('customerId') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const result = await paymentService.listPayments(businessId, { customerId, page, limit });
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, user } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const parsed = RecordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await paymentService.recordPayment(
      businessId,
      user._id.toString(),
      parsed.data
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          paymentId: result.payment._id.toString(),
          receiptNumber: result.receiptNumber,
          allocatedInvoiceIds: result.allocatedInvoiceIds,
          onAccountCreditPaise: result.onAccountCreditPaise,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    const msg = error instanceof Error ? error.message : 'Failed to record payment';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

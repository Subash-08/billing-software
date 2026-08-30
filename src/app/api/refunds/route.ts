/**
 * GET /api/refunds — List customer refunds
 * POST /api/refunds — Process customer refund
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { refundService } from '@/services/refund.service';
import { ApplicationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') || undefined;

    const refunds = await refundService.getRefunds(businessId, customerId);
    return NextResponse.json({ success: true, count: refunds.length, refunds });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch refunds';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, user } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const refund = await refundService.processRefund(businessId, user._id.toString(), body);
    return NextResponse.json({ success: true, refund }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to process refund';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

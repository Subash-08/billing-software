/**
 * GET /api/payments/[id]/pdf — Authoritative Payment Receipt PDF View Model & Payload
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { pdfDocumentService } from '@/services/pdf-document.service';
import { ApplicationError } from '@/lib/errors';
import { Types } from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid payment ID format' }, { status: 400 });
    }

    const viewModel = await pdfDocumentService.getPaymentReceiptViewModel(businessId, id);
    return NextResponse.json({ success: true, data: viewModel });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    const msg = error instanceof Error ? error.message : 'Failed to generate payment receipt view model';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

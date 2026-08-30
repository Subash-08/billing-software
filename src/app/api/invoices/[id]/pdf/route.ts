/**
 * GET /api/invoices/[id]/pdf — Authoritative Invoice PDF View Model & Document Payload
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
      return NextResponse.json({ success: false, error: 'Invalid invoice ID format' }, { status: 400 });
    }

    const viewModel = await pdfDocumentService.getInvoiceViewModel(businessId, id);
    return NextResponse.json({ success: true, data: viewModel });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    const msg = error instanceof Error ? error.message : 'Failed to generate invoice document view model';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

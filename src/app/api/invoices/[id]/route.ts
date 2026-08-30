import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { invoiceService } from '@/services/invoice.service';
import { ApplicationError } from '@/lib/errors';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { id } = await params;

    const invoice = await invoiceService.getInvoice(businessId, id);
    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { id } = await params;
    const body = await req.json();

    const invoice = await invoiceService.updateDraftInvoice(businessId, id, body);
    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to update draft invoice' }, { status: 500 });
  }
}

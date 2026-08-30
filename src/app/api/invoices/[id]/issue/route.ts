import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { invoiceService } from '@/services/invoice.service';
import { ApplicationError } from '@/lib/errors';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, user } = await requireAuthenticatedBusiness();
    const { id } = await params;

    const invoice = await invoiceService.issueInvoice(businessId, id, user._id.toString());
    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to issue invoice' }, { status: 500 });
  }
}

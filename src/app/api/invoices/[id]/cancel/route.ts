import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { invoiceService } from '@/services/invoice.service';
import { ApplicationError } from '@/lib/errors';
import { CancelInvoiceSchema } from '@/validations/invoice.schema';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, user } = await requireAuthenticatedBusiness();
    const { id } = await params;
    const body = await req.json();
    const { reason } = CancelInvoiceSchema.parse(body);

    const invoice = await invoiceService.cancelInvoice(businessId, id, reason, user._id.toString());
    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to cancel invoice' }, { status: 500 });
  }
}

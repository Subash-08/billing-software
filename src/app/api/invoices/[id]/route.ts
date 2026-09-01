import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { invoiceService } from '@/services/invoice.service';
import { ApplicationError } from '@/lib/errors';
import { InvoiceModel } from '@/db/models/invoice.model';
import { connectToDatabase } from '@/db/connection';
import { Types } from 'mongoose';

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
    const { businessId, user } = await requireAuthenticatedBusiness();
    const { id } = await params;
    const body = await req.json();

    const expectedRevision = Number(req.headers.get('If-Match') || body.expectedRevision || body.revision || 1);

    const invoice = await invoiceService.updateDraftInvoiceWithRevision(businessId, id, body, expectedRevision, user._id.toString());
    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to update draft invoice' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { id } = await params;

    await connectToDatabase();
    const inv = await InvoiceModel.findOne({ _id: new Types.ObjectId(id), businessId: new Types.ObjectId(businessId) }).exec();

    if (!inv) {
      return NextResponse.json({ success: false, error: `Invoice '${id}' not found.` }, { status: 404 });
    }

    if (inv.status !== 'DRAFT') {
      return NextResponse.json(
        {
          success: false,
          code: 'INVOICE_ISSUED_LOCKED',
          error: 'Issued or cancelled invoices cannot be deleted. Use POST /api/invoices/[id]/cancel to cancel an issued invoice.',
        },
        { status: 423 }
      );
    }

    // Hard-delete DRAFT invoice only
    await InvoiceModel.deleteOne({ _id: inv._id, businessId: new Types.ObjectId(businessId) }).exec();

    return NextResponse.json({ success: true, message: 'Draft invoice deleted successfully.' });
  } catch (error: any) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete draft invoice' }, { status: 500 });
  }
}

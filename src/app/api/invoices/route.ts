import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { invoiceService } from '@/services/invoice.service';
import { ApplicationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status') || undefined;
    const paymentStatus = searchParams.get('paymentStatus') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const result = await invoiceService.listInvoices(businessId, {
      status,
      paymentStatus,
      search,
      page,
      limit,
    });

    const format = searchParams.get('format');
    if (format === 'csv') {
      const csvResult = await invoiceService.listInvoices(businessId, {
        status,
        paymentStatus,
        search,
        page: 1,
        limit: 1000,
      });
      const csvHeader = 'InvoiceNumber,Date,Customer,SupplyType,GrandTotal,Status,PaymentStatus\n';
      const csvRows = csvResult.items
        .map((inv: any) => `"${inv.invoiceNumber}","${inv.invoiceDate}","${inv.billToSnapshot?.name || ''}","${inv.supplyType || ''}","${(inv.grandTotal / 100).toFixed(2)}","${inv.status}","${inv.paymentStatus}"`)
        .join('\n');

      return new NextResponse(csvHeader + csvRows, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="invoices-export.csv"',
        },
      });
    }

    const { CreditNoteModel } = await import('@/db/models/credit-note.model');
    const { Types } = await import('mongoose');
    const creditNotes = await CreditNoteModel.find({
      businessId: new Types.ObjectId(businessId),
      status: 'ISSUED',
      originalInvoiceId: { $ne: null },
    }).lean().exec();

    const cnMap = new Map<string, number>();
    creditNotes.forEach((cn) => {
      if (cn.originalInvoiceId) {
        const invId = cn.originalInvoiceId.toString();
        const current = cnMap.get(invId) || 0;
        cnMap.set(invId, current + (cn.grandTotal || 0));
      }
    });

    const itemsWithReturns = result.items.map((inv: any) => ({
      ...(typeof inv.toObject === 'function' ? inv.toObject() : inv),
      returnedAmount: cnMap.get(inv._id.toString()) || 0,
    }));

    return NextResponse.json({ success: true, ...result, items: itemsWithReturns });
  } catch (error: any) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const invoice = await invoiceService.createDraftInvoice(businessId, body);

    return NextResponse.json({ success: true, data: invoice }, { status: 201 });
  } catch (error: any) {
    if (error?.name === 'ZodError' || error?.issues) {
      const issues = error.issues || error.errors || [];
      return NextResponse.json(
        { success: false, error: issues[0]?.message || 'Validation failed', details: issues },
        { status: 400 }
      );
    }
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to create draft invoice' }, { status: 500 });
  }
}

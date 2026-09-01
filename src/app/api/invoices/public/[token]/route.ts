import { NextRequest, NextResponse } from 'next/server';
import { InvoiceModel } from '@/db/models/invoice.model';
import { connectToDatabase } from '@/db/connection';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    await connectToDatabase();

    const invoice = await InvoiceModel.findOne({
      shareToken: resolvedParams.token,
    })
      .select('-businessId -createdById -revision -issuanceIdempotencyKey')
      .lean()
      .exec();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found or invalid token' }, { status: 404 });
    }

    if (invoice.shareTokenExpiresAt && new Date(invoice.shareTokenExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load public invoice' }, { status: 500 });
  }
}

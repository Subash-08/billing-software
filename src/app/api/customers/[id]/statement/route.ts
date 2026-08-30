/**
 * GET /api/customers/[id]/statement — Customer Statement of Account
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { customerLedgerService } from '@/services/customer-ledger.service';
import { InvoiceModel } from '@/db/models/invoice.model';
import { PaymentModel } from '@/db/models/payment.model';
import { ApplicationError } from '@/lib/errors';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { businessId } = await requireAuthenticatedBusiness();
    await connectToDatabase();

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid customer ID format' }, { status: 400 });
    }

    const bId = new Types.ObjectId(businessId);
    const cId = new Types.ObjectId(id);

    // Fetch invoices, payments, and credit ledger
    const [invoices, payments, creditBalance, ledgerHistory] = await Promise.all([
      InvoiceModel.find({ businessId: bId, customerId: cId })
        .sort({ invoiceDate: -1 })
        .exec(),
      PaymentModel.find({ businessId: bId, customerId: cId })
        .sort({ paymentDate: -1 })
        .exec(),
      customerLedgerService.getLiveBalance(businessId, id),
      customerLedgerService.getLedgerHistory(businessId, id),
    ]);

    const totalInvoicedPaise = invoices
      .filter((inv) => inv.status === 'ISSUED')
      .reduce((sum, inv) => sum + inv.grandTotal, 0);

    const totalPaidPaise = invoices
      .filter((inv) => inv.status === 'ISSUED')
      .reduce((sum, inv) => sum + inv.paidAmount, 0);

    const totalOutstandingPaise = invoices
      .filter((inv) => inv.status === 'ISSUED')
      .reduce((sum, inv) => sum + inv.outstandingBalance, 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalInvoicedPaise,
          totalPaidPaise,
          totalOutstandingPaise,
          creditBalancePaise: creditBalance.availableBalancePaise,
        },
        invoices,
        payments,
        creditLedgerHistory: ledgerHistory,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch customer statement';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

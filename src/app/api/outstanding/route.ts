/**
 * GET /api/outstanding — 5-bucket aging report
 *
 * Returns all outstanding invoices grouped into aging buckets.
 * reportDate defaults to today in Asia/Kolkata if not supplied.
 * dueDate = null → CURRENT bucket (Rule 28 / A5).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { InvoiceModel } from '@/db/models/invoice.model';
import { getAgingBucket, getDaysOverdue } from '@/engine/settlement/settlement.aging';
import { getTodayBusinessDate } from '@/lib/business-date';
import { ApplicationError } from '@/lib/errors';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import type { AgingBucket, AgingEntry, AgingReport } from '@/engine/settlement/settlement.types';

const BUCKETS: AgingBucket[] = ['CURRENT', '1_30_DAYS', '31_60_DAYS', '61_90_DAYS', 'OVER_90_DAYS'];

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') || undefined;
    const reportDate = searchParams.get('reportDate') || getTodayBusinessDate();

    const query: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      status: 'ISSUED',
      outstandingBalance: { $gt: 0 },
    };
    if (customerId) {
      query.customerId = new Types.ObjectId(customerId);
    }

    // FIFO sort: dueDate ASC (null last), then invoiceDate, invoiceNumber, _id
    const invoices = await InvoiceModel.find(query)
      .sort({ dueDate: 1, invoiceDate: 1, invoiceNumber: 1, _id: 1 })
      .exec();

    const buckets: Record<AgingBucket, AgingEntry[]> = {
      CURRENT: [],
      '1_30_DAYS': [],
      '31_60_DAYS': [],
      '61_90_DAYS': [],
      OVER_90_DAYS: [],
    };

    for (const invoice of invoices) {
      // dueDate stored as Date | null — convert to YYYY-MM-DD string or null [A5]
      const dueDateStr = invoice.dueDate
        ? (invoice.dueDate as Date).toISOString().slice(0, 10)
        : null;

      const bucket = getAgingBucket(dueDateStr, reportDate);
      const daysOverdue = getDaysOverdue(dueDateStr, reportDate);

      buckets[bucket].push({
        invoiceId: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId.toString(),
        customerName: invoice.billToSnapshot?.name || '',
        invoiceDate: (invoice.invoiceDate as Date).toISOString().slice(0, 10),
        dueDate: dueDateStr,
        grandTotalPaise: invoice.grandTotal,
        paidAmountPaise: invoice.paidAmount,
        outstandingBalancePaise: invoice.outstandingBalance,
        bucket,
        daysOverdue,
      });
    }

    const totals = Object.fromEntries(
      BUCKETS.map((b) => [b, buckets[b].reduce((s, e) => s + e.outstandingBalancePaise, 0)])
    ) as Record<AgingBucket, number>;

    const grandOutstandingPaise = BUCKETS.reduce((s, b) => s + totals[b], 0);

    const report: AgingReport = {
      reportDate,
      buckets,
      totals,
      grandOutstandingPaise,
    };

    return NextResponse.json({ success: true, data: report });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    const msg = error instanceof Error ? error.message : 'Failed to generate outstanding report';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

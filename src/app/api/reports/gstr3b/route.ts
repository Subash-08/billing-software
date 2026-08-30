/**
 * GET /api/reports/gstr3b — GSTR-3B Table 3.1 Statutory Summary Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { gstReportService } from '@/services/gst-report.service';
import { ApplicationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);

    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    const report = await gstReportService.generateGstr3bSummary(businessId, { fromDate, toDate });
    return NextResponse.json({ success: true, data: report });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    const msg = error instanceof Error ? error.message : 'Failed to generate GSTR-3B summary';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { reportService } from '@/services/report.service';
import { ApplicationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireAuthenticatedBusiness();

    const report = await reportService.getStockValuationReport(business._id.toString());
    return NextResponse.json({ success: true, data: report });
  } catch (err: any) {
    if (err instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { reportService } from '@/services/report.service';
import { ApplicationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);

    const filter = {
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    };

    const report = await reportService.getPurchaseReport(business._id.toString(), filter);
    return NextResponse.json({ success: true, data: report });
  } catch (err: any) {
    if (err instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

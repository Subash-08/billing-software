/**
 * GET /api/dashboard — Authoritative Sales Billing & Analytics Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { dashboardService } from '@/services/dashboard.service';
import { ApplicationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);

    const period = (searchParams.get('period') as any) || undefined;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    const data = await dashboardService.getDashboardData(businessId, { period, fromDate, toDate });
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch dashboard metrics';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

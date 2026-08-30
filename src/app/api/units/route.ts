import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { unitService } from '@/services/unit.service';

export async function GET(req: NextRequest) {
  try {
    await requireAuthenticatedBusiness();
    const units = await unitService.listActiveUnits();
    return NextResponse.json({ success: true, units });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch units' }, { status: 401 });
  }
}

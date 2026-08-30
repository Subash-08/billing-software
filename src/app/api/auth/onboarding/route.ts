import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth-context';
import { authService } from '@/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const business = await authService.completeBusinessOnboarding(user._id.toString(), body);
    return NextResponse.json({ success: true, businessId: business._id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Onboarding failed' }, { status: 400 });
  }
}

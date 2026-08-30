import { NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { businessService } from '@/services/business.service';

export async function GET() {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const progress = await businessService.getDerivedOnboardingProgress(businessId);
    return NextResponse.json({ success: true, progress });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch onboarding progress' }, { status: 401 });
  }
}

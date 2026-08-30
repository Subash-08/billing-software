import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { businessService } from '@/services/business.service';

export async function GET() {
  try {
    const { business } = await requireAuthenticatedBusiness();
    const bankDetails = business.bankDetails || {};
    return NextResponse.json({
      success: true,
      bankDetails: {
        ...bankDetails,
        maskedAccountNumber: bankDetails.accountNumber ? `XXXX XXXX ${bankDetails.accountNumber.slice(-4)}` : undefined,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch bank details' }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, businessId } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const updated = await businessService.updateBankDetails(businessId, user._id.toString(), body);
    revalidatePath('/settings/bank-details');
    revalidatePath('/settings/business');
    revalidatePath('/');
    return NextResponse.json({ success: true, business: updated });
  } catch (error: any) {
    const status = error.name === 'ForbiddenError' ? 403 : error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to update bank details' }, { status });
  }
}

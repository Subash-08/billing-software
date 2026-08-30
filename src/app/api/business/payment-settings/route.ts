import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { businessService } from '@/services/business.service';

export async function GET() {
  try {
    const { business } = await requireAuthenticatedBusiness();
    const defaultModes = [
      { modeCode: 'CASH', enabled: true, customLabel: 'Cash Settlement', displayOrder: 1 },
      { modeCode: 'UPI', enabled: true, customLabel: 'UPI / QR Code', displayOrder: 2 },
      { modeCode: 'BANK_TRANSFER', enabled: true, customLabel: 'IMPS / NEFT Bank Transfer', displayOrder: 3 },
      { modeCode: 'CHEQUE', enabled: false, customLabel: 'Cheque Payment', displayOrder: 4 },
      { modeCode: 'CARD', enabled: true, customLabel: 'Credit / Debit Card', displayOrder: 5 },
    ];
    return NextResponse.json({
      success: true,
      paymentSettings: business.paymentSettings && business.paymentSettings.length > 0 ? business.paymentSettings : defaultModes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch payment settings' }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, businessId } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const updated = await businessService.updatePaymentSettings(businessId, user._id.toString(), body);
    revalidatePath('/settings/payments');
    revalidatePath('/');
    return NextResponse.json({ success: true, business: updated });
  } catch (error: any) {
    const status = error.name === 'ForbiddenError' ? 403 : error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to update payment settings' }, { status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { businessService } from '@/services/business.service';

export async function GET() {
  try {
    const { business } = await requireAuthenticatedBusiness();
    return NextResponse.json({
      success: true,
      invoiceSettings: business.invoiceSettings || {
        prefix: 'INV',
        financialYearFormat: 'YY-YY',
        numberingType: 'AUTOMATIC',
        defaultPaymentTermsDays: 30,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch invoice settings' }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, businessId } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const updated = await businessService.updateInvoiceSettings(businessId, user._id.toString(), body);
    revalidatePath('/settings/invoices');
    revalidatePath('/');
    return NextResponse.json({ success: true, business: updated });
  } catch (error: any) {
    const status = error.name === 'ForbiddenError' ? 403 : error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to update invoice settings' }, { status });
  }
}

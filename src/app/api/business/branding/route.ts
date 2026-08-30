import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { businessService } from '@/services/business.service';

export async function GET() {
  try {
    const { business } = await requireAuthenticatedBusiness();
    return NextResponse.json({ success: true, branding: business.branding || {} });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch branding settings' }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, businessId } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const updated = await businessService.updateBranding(businessId, user._id.toString(), body);
    revalidatePath('/settings/branding');
    revalidatePath('/settings/business');
    revalidatePath('/');
    return NextResponse.json({ success: true, business: updated });
  } catch (error: any) {
    const status = error.name === 'ForbiddenError' ? 403 : error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to update branding settings' }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, business, businessId } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);
    const assetType = searchParams.get('assetType') as 'logo' | 'invoiceLogo' | 'signature';

    if (!assetType || !['logo', 'invoiceLogo', 'signature'].includes(assetType)) {
      return NextResponse.json({ error: 'Valid assetType (logo, invoiceLogo, signature) required' }, { status: 400 });
    }

    const currentBranding = business.branding || {};
    delete (currentBranding as any)[assetType];

    const updated = await businessService.updateBranding(businessId, user._id.toString(), currentBranding);
    revalidatePath('/settings/branding');
    revalidatePath('/');
    return NextResponse.json({ success: true, business: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete branding asset' }, { status: 400 });
  }
}

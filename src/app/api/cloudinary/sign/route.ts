import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { cloudinaryService } from '@/services/cloudinary.service';

export async function POST(req: NextRequest) {
  try {
    await requireAuthenticatedBusiness();
    const body = await req.json().catch(() => ({}));
    const folder = body.folder || 'niramaalai_business_assets';

    const params = cloudinaryService.generateUploadSignature(folder);
    return NextResponse.json({ success: true, params });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate upload signature' }, { status: 400 });
  }
}

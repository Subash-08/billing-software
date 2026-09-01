import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { supplierService } from '@/services/supplier.service';
import { ApplicationError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireAuthenticatedBusiness();
    const { id: supplierId } = await params;

    const { searchParams } = new URL(req.url);
    const includeStatement = searchParams.get('statement') === 'true';

    if (includeStatement) {
      const statement = await supplierService.getSupplierStatement(business._id.toString(), supplierId);
      return NextResponse.json({ success: true, ...statement });
    }

    const supplier = await supplierService.getSupplierById(business._id.toString(), supplierId);
    return NextResponse.json({ success: true, data: supplier });
  } catch (err: any) {
    if (err instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

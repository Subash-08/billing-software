import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { inventoryService } from '@/services/inventory.service';
import { ApplicationError } from '@/lib/errors';
import { z } from 'zod';

const stockAdjustmentSchema = z.object({
  type: z.enum(['OPENING', 'PURCHASE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE']),
  quantity: z.number().positive('Quantity must be greater than zero'),
  notes: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireAuthenticatedBusiness();
    const { id: productId } = await params;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await inventoryService.getStockLedger(business._id.toString(), productId, { page, limit });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, business } = await requireAuthenticatedBusiness();
    const { id: productId } = await params;
    const body = await req.json();

    const data = stockAdjustmentSchema.parse(body);

    const movement = await inventoryService.recordMovement(
      business._id.toString(),
      {
        productId,
        type: data.type,
        quantity: data.quantity,
        referenceType: 'ADJUSTMENT',
        notes: data.notes,
        createdBy: user._id.toString(),
      }
    );

    return NextResponse.json({ success: true, data: movement }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: err.errors }, { status: 400 });
    }
    if (err instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { purchaseInvoiceService } from '@/services/purchase-invoice.service';
import { ApplicationError } from '@/lib/errors';
import { z } from 'zod';

const createPurchaseInvoiceSchema = z.object({
  supplierId: z.string().trim().min(1, 'Supplier ID is required'),
  supplierInvoiceNumber: z.string().trim().optional(),
  supplierInvoiceDate: z.string().optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().optional(),
      itemType: z.enum(['GOODS', 'SERVICES']).default('GOODS'),
      name: z.string().trim().min(1, 'Item name is required'),
      hsnSacCode: z.string().trim().optional(),
      quantity: z.number().positive('Quantity must be greater than zero'),
      unit: z.string().trim().optional(),
      rate: z.number().min(0, 'Rate cannot be negative'),
      isPriceInclusiveOfGst: z.boolean().optional().default(false),
      gstRate: z.number().min(0).default(18),
    })
  ).min(1, 'At least one item is required'),
});

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);

    const query = {
      supplierId: searchParams.get('supplierId') || undefined,
      status: searchParams.get('status') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
    };

    const result = await purchaseInvoiceService.listPurchaseInvoices(business._id.toString(), query);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, business } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const data = createPurchaseInvoiceSchema.parse(body);
    const purchase = await purchaseInvoiceService.recordPurchaseInvoice(business._id.toString(), user._id.toString(), data);

    return NextResponse.json({ success: true, data: purchase }, { status: 201 });
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

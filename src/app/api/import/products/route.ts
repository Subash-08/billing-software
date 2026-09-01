import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { ProductModel } from '@/db/models/product.model';
import { connectToDatabase } from '@/db/connection';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ApplicationError } from '@/lib/errors';

const importProductItemSchema = z.object({
  name: z.string().trim().min(2, 'Product name required'),
  code: z.string().trim().toUpperCase().optional(),
  hsnCode: z.string().trim().regex(/^[0-9]{4,8}$/, 'HSN code must be 4 to 8 digits'),
  unit: z.string().trim().default('PCS'),
  uqc: z.string().trim().default('PCS'),
  sellingPrice: z.number().min(0),
  purchasePrice: z.number().min(0).optional(),
  defaultGstRate: z.number().min(0).default(18),
  stockQuantity: z.number().min(0).default(0),
});

const importPayloadSchema = z.object({
  products: z.array(importProductItemSchema).min(1, 'At least one product required'),
});

export async function POST(req: NextRequest) {
  try {
    const { user, business } = await requireAuthenticatedBusiness();
    await connectToDatabase();
    const bId = new Types.ObjectId(business._id.toString());

    const body = await req.json();
    const data = importPayloadSchema.parse(body);

    const createdProducts: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < data.products.length; i++) {
      const item = data.products[i];
      try {
        if (item.code) {
          const existing = await ProductModel.findOne({ businessId: bId, code: item.code }).exec();
          if (existing) {
            errors.push({ row: i + 1, code: item.code, error: `SKU code '${item.code}' already exists` });
            continue;
          }
        }

        const product = await ProductModel.create({
          businessId: bId,
          type: 'PRODUCT',
          name: item.name,
          code: item.code,
          hsnCode: item.hsnCode,
          unit: item.unit,
          uqc: item.uqc,
          sellingPrice: item.sellingPrice,
          purchasePrice: item.purchasePrice,
          defaultGstRate: item.defaultGstRate,
          stockQuantity: item.stockQuantity,
          trackInventory: true,
          status: 'ACTIVE',
        });

        createdProducts.push(product);
      } catch (err: any) {
        errors.push({ row: i + 1, name: item.name, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      importedCount: createdProducts.length,
      failedCount: errors.length,
      errors,
    }, { status: 201 });
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

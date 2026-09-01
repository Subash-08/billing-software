import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { inventoryService } from '@/services/inventory.service';
import { ProductModel } from '@/db/models/product.model';
import { connectToDatabase } from '@/db/connection';
import { Types } from 'mongoose';
import { ApplicationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireAuthenticatedBusiness();
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    if (lowStockOnly) {
      const lowStockProducts = await inventoryService.getLowStockAlerts(business._id.toString());
      return NextResponse.json({ success: true, products: lowStockProducts });
    }

    const bId = new Types.ObjectId(business._id.toString());
    const products = await ProductModel.find({ businessId: bId, status: 'ACTIVE' })
      .select('name code hsnCode unit sellingPrice stockQuantity reorderLevel trackInventory')
      .sort({ name: 1 })
      .lean()
      .exec();

    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    if (err instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

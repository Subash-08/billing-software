import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { ProductModel } from '@/db/models/product.model';
import { connectToDatabase } from '@/db/connection';
import { Types } from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireAuthenticatedBusiness();
    await connectToDatabase();
    const bId = new Types.ObjectId(business._id.toString());

    const products = await ProductModel.find({ businessId: bId, status: 'ACTIVE' })
      .sort({ name: 1 })
      .lean()
      .exec();

    const headers = [
      'Product Name',
      'SKU Code',
      'HSN Code',
      'Unit',
      'Selling Price (₹)',
      'Purchase Price (₹)',
      'Default GST Rate (%)',
      'Stock Quantity',
      'Reorder Level',
      'Selling Valuation (₹)',
      'Purchase Valuation (₹)',
    ];

    const csvRows = [headers.join(',')];

    for (const p of products) {
      const stock = p.stockQuantity || 0;
      const sellingPrice = p.sellingPrice || 0;
      const purchasePrice = p.purchasePrice || 0;

      const row = [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.code || ''}"`,
        `"${p.hsnCode || ''}"`,
        `"${p.unit || 'PCS'}"`,
        sellingPrice.toFixed(2),
        purchasePrice.toFixed(2),
        p.defaultGstRate,
        stock,
        p.reorderLevel || 0,
        (stock * sellingPrice).toFixed(2),
        (stock * purchasePrice).toFixed(2),
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inventory-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { salesOrderService } from '@/services/sales-order.service';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);

    const result = await salesOrderService.listSalesOrders(user._id.toString(), {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch sales orders' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const salesOrder = await salesOrderService.createSalesOrder(user._id.toString(), body);
    return NextResponse.json({ success: true, salesOrder }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create sales order' }, { status: 400 });
  }
}

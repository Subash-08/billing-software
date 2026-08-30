import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { productService } from '@/services/product.service';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);

    const query = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      hsnCode: searchParams.get('hsnCode') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    const result = await productService.listProducts(user._id.toString(), query);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch products' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const product = await productService.createProduct(user._id.toString(), body);
    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError || error.name === 'ZodError') {
      const issues = error.issues || (error as any).errors || [];
      return NextResponse.json(
        {
          error: issues[0]?.message || 'Validation failed',
          details: issues,
        },
        { status: 400 }
      );
    }
    const status = error.name === 'ConflictError' ? 409 : error.name === 'ValidationError' ? 400 : 400;
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status });
  }
}

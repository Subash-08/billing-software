import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';
import { ZodError } from 'zod';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { productService } from '@/services/product.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 });
    }

    const product = await productService.getProductById(user._id.toString(), id);
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    const status = error.name === 'NotFoundError' ? 404 : 401;
    return NextResponse.json({ error: error.message || 'Product not found' }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 });
    }

    const body = await req.json();

    const product = await productService.updateProduct(user._id.toString(), id, body);
    revalidatePath('/products');
    revalidatePath(`/products/${id}`);
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    if (error instanceof ZodError || error.name === 'ZodError') {
      const issues = error.issues || (error as any).errors || [];
      return NextResponse.json(
        { error: issues[0]?.message || 'Validation failed', details: issues },
        { status: 400 }
      );
    }
    const status = error.name === 'ConflictError' ? 409 : error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 });
    }

    if (action === 'deactivate') {
      const product = await productService.deactivateProduct(user._id.toString(), id);
      revalidatePath('/products');
      revalidatePath(`/products/${id}`);
      return NextResponse.json({ success: true, product, message: 'Product deactivated successfully' });
    }

    const result = await productService.deleteProduct(user._id.toString(), id);
    revalidatePath('/products');
    revalidatePath(`/products/${id}`);
    return NextResponse.json({ ...result, message: 'Product deleted successfully' });
  } catch (error: any) {
    const status = error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to delete product' }, { status });
  }
}

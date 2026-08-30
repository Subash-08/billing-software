import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { categoryService } from '@/services/category.service';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400 });
    }

    const body = await req.json();

    const category = await categoryService.updateCategory(user._id.toString(), id, body);
    revalidatePath('/categories');
    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    const status = error.name === 'ConflictError' ? 409 : error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400 });
    }

    const category = await categoryService.deactivateCategory(user._id.toString(), id);
    revalidatePath('/categories');
    return NextResponse.json({ success: true, category, message: 'Category deactivated successfully' });
  } catch (error: any) {
    const status = error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to deactivate category' }, { status });
  }
}

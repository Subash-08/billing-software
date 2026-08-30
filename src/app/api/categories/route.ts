import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { categoryService } from '@/services/category.service';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);

    const type = (searchParams.get('type') as any) || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const search = searchParams.get('search') || undefined;

    const categories = await categoryService.listCategories(user._id.toString(), type, status, search);
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch categories' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const category = await categoryService.createCategory(user._id.toString(), body);
    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error: any) {
    const status = error.name === 'ConflictError' ? 409 : 400;
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status });
  }
}

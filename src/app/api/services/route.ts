import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { serviceService } from '@/services/service.service';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);

    const query = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      sacCode: searchParams.get('sacCode') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    const result = await serviceService.listServices(user._id.toString(), query);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch services' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const serviceItem = await serviceService.createService(user._id.toString(), body);
    return NextResponse.json({ success: true, service: serviceItem }, { status: 201 });
  } catch (error: any) {
    const status = error.name === 'ConflictError' ? 409 : error.name === 'ValidationError' ? 400 : 400;
    return NextResponse.json({ error: error.message || 'Failed to create service' }, { status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { serviceService } from '@/services/service.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid service ID format' }, { status: 400 });
    }

    const service = await serviceService.getServiceById(user._id.toString(), id);
    return NextResponse.json({ success: true, service });
  } catch (error: any) {
    const status = error.name === 'NotFoundError' ? 404 : 401;
    return NextResponse.json({ error: error.message || 'Service not found' }, { status });
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
      return NextResponse.json({ error: 'Invalid service ID format' }, { status: 400 });
    }

    const body = await req.json();

    const service = await serviceService.updateService(user._id.toString(), id, body);
    revalidatePath('/services');
    revalidatePath(`/services/${id}`);
    return NextResponse.json({ success: true, service });
  } catch (error: any) {
    const status = error.name === 'ConflictError' ? 409 : error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to update service' }, { status });
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
      return NextResponse.json({ error: 'Invalid service ID format' }, { status: 400 });
    }

    const service = await serviceService.deactivateService(user._id.toString(), id);
    revalidatePath('/services');
    revalidatePath(`/services/${id}`);
    return NextResponse.json({ success: true, service, message: 'Service deactivated successfully' });
  } catch (error: any) {
    const status = error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to deactivate service' }, { status });
  }
}

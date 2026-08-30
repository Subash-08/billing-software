import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { customerService } from '@/services/customer.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid customer ID format' }, { status: 400 });
    }

    const body = await req.json();

    const customer = await customerService.addShippingAddress(user._id.toString(), id, body);
    revalidatePath('/customers');
    revalidatePath(`/customers/${id}`);
    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    const status = error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to add shipping address' }, { status });
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
      return NextResponse.json({ error: 'Invalid customer ID format' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const addressId = searchParams.get('addressId');

    if (!addressId) {
      return NextResponse.json({ error: 'addressId query parameter required' }, { status: 400 });
    }

    const customer = await customerService.removeShippingAddress(user._id.toString(), id, addressId);
    revalidatePath('/customers');
    revalidatePath(`/customers/${id}`);
    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    const status = error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to remove shipping address' }, { status });
  }
}

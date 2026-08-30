import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';
import { ZodError } from 'zod';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { customerService } from '@/services/customer.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid customer ID format' }, { status: 400 });
    }

    const customer = await customerService.getCustomerById(user._id.toString(), id);
    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    const status = error.name === 'NotFoundError' ? 404 : 401;
    return NextResponse.json({ error: error.message || 'Customer not found' }, { status });
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
      return NextResponse.json({ error: 'Invalid customer ID format' }, { status: 400 });
    }

    const body = await req.json();

    const customer = await customerService.updateCustomer(user._id.toString(), id, body);
    revalidatePath('/customers');
    revalidatePath(`/customers/${id}`);
    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    if (error instanceof ZodError || error.name === 'ZodError') {
      const issues = error.issues || (error as any).errors || [];
      return NextResponse.json(
        { error: issues[0]?.message || 'Validation failed', details: issues },
        { status: 400 }
      );
    }
    const status = error.name === 'NotFoundError' ? 404 : error.name === 'ForbiddenError' ? 403 : 400;
    return NextResponse.json({ error: error.message || 'Failed to update customer' }, { status });
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
      return NextResponse.json({ error: 'Invalid customer ID format' }, { status: 400 });
    }

    if (action === 'archive') {
      const customer = await customerService.archiveCustomer(user._id.toString(), id);
      revalidatePath('/customers');
      revalidatePath(`/customers/${id}`);
      return NextResponse.json({ success: true, customer, message: 'Customer archived successfully' });
    }

    const result = await customerService.deleteCustomer(user._id.toString(), id);
    revalidatePath('/customers');
    revalidatePath(`/customers/${id}`);
    return NextResponse.json({ ...result, message: 'Customer deleted successfully' });
  } catch (error: any) {
    const status = error.name === 'NotFoundError' ? 404 : error.name === 'ForbiddenError' ? 403 : 400;
    return NextResponse.json({ error: error.message || 'Failed to delete customer' }, { status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { customerService } from '@/services/customer.service';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || undefined;
    const status = (searchParams.get('status') as 'ACTIVE' | 'INACTIVE') || undefined;
    const gstTreatment = searchParams.get('gstTreatment') || undefined;
    const customerType = (searchParams.get('customerType') as 'BUSINESS' | 'INDIVIDUAL') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const { customers, total } = await customerService.listCustomers(
      user._id.toString(),
      { search, status, gstTreatment, customerType },
      { limit, skip }
    );

    const format = searchParams.get('format');
    if (format === 'csv') {
      const { customers } = await customerService.listCustomers(
        user._id.toString(),
        { search, status, gstTreatment, customerType },
        { limit: 1000, skip: 0 }
      );
      const csvHeader = 'Name,GSTIN,Phone,Email,City,State\n';
      const csvRows = customers
        .map(
          (c: any) =>
            `"${c.name || ''}","${c.gstin || ''}","${c.phone || ''}","${c.email || ''}","${c.billingAddress?.city || ''}","${c.billingAddress?.state || ''}"`
        )
        .join('\n');

      return new NextResponse(csvHeader + csvRows, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="customers-export.csv"',
        },
      });
    }

    return NextResponse.json({
      success: true,
      customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list customers' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const customer = await customerService.createCustomer(user._id.toString(), body);
    revalidatePath('/customers');
    return NextResponse.json({ success: true, customer }, { status: 201 });
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
    const status = error.name === 'ForbiddenError' ? 403 : error.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to create customer' }, { status });
  }
}

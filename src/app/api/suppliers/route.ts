import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { supplierService } from '@/services/supplier.service';
import { ApplicationError } from '@/lib/errors';
import { z } from 'zod';

const createSupplierSchema = z.object({
  name: z.string().trim().min(2, 'Supplier name is required'),
  legalName: z.string().trim().optional(),
  gstin: z.string().trim().toUpperCase().optional(),
  gstTreatment: z.enum(['REGISTERED', 'UNREGISTERED', 'COMPOSITION', 'SEZ', 'OVERSEAS']).optional(),
  stateCode: z.string().trim().length(2, '2-digit state code is required'),
  phone: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  address: z.object({
    addressLine1: z.string().trim().min(2, 'Address line 1 is required'),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().min(2, 'City is required'),
    district: z.string().trim().optional(),
    state: z.string().trim().min(2, 'State is required'),
    stateCode: z.string().trim().length(2, 'State code is required'),
    pincode: z.string().trim().min(6, 'Pincode must be 6 digits'),
    country: z.string().trim().optional(),
  }),
  bankDetails: z.object({
    accountName: z.string().trim().optional(),
    accountNumber: z.string().trim().optional(),
    bankName: z.string().trim().optional(),
    ifscCode: z.string().trim().toUpperCase().optional(),
    branch: z.string().trim().optional(),
  }).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);

    const query = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
    };

    const result = await supplierService.listSuppliers(business._id.toString(), query);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, business } = await requireAuthenticatedBusiness();
    const body = await req.json();

    const data = createSupplierSchema.parse(body);
    const supplier = await supplierService.createSupplier(business._id.toString(), user._id.toString(), data as any);

    return NextResponse.json({ success: true, data: supplier }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: err.errors }, { status: 400 });
    }
    if (err instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

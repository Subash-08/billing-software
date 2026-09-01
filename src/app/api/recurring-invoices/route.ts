import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { recurringInvoiceService } from '@/services/recurring-invoice.service';
import { ApplicationError } from '@/lib/errors';
import { z } from 'zod';

const createScheduleSchema = z.object({
  customerId: z.string().trim().min(1, 'Customer ID required'),
  title: z.string().trim().min(2, 'Schedule title required'),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
  intervalDays: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  autoIssue: z.boolean().optional(),
  items: z.array(
    z.object({
      productId: z.string().optional(),
      serviceId: z.string().optional(),
      itemType: z.enum(['GOODS', 'SERVICES']).default('GOODS'),
      name: z.string().trim().min(1, 'Item name required'),
      description: z.string().optional(),
      hsnSacCode: z.string().trim().min(1, 'HSN/SAC required'),
      quantity: z.number().positive(),
      unit: z.string().optional(),
      rate: z.number().min(0),
      gstRate: z.number().min(0).default(18),
      priceMode: z.enum(['EXCLUSIVE', 'INCLUSIVE']).default('EXCLUSIVE'),
    })
  ).min(1, 'At least one item required'),
});

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireAuthenticatedBusiness();
    const schedules = await recurringInvoiceService.listSchedules(business._id.toString());
    return NextResponse.json({ success: true, schedules });
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
    const { searchParams } = new URL(req.url);

    if (searchParams.get('action') === 'process') {
      const result = await recurringInvoiceService.processDueSchedules(business._id.toString());
      return NextResponse.json({ success: true, ...result });
    }

    const body = await req.json();
    const data = createScheduleSchema.parse(body);
    const schedule = await recurringInvoiceService.createSchedule(business._id.toString(), user._id.toString(), data as any);

    return NextResponse.json({ success: true, data: schedule }, { status: 201 });
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

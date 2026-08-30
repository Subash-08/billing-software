/**
 * POST /api/templates/[id]/default — Set Active Default Template Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { invoiceTemplateService } from '@/services/invoice-template.service';
import { ApplicationError } from '@/lib/errors';
import { Types } from 'mongoose';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid template ID format' }, { status: 400 });
    }

    const defaultTpl = await invoiceTemplateService.setDefaultTemplate(businessId, id);
    return NextResponse.json({ success: true, data: defaultTpl });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to set default template';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

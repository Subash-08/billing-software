/**
 * POST /api/templates/[id]/clone — Template Duplication Endpoint
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

    const cloned = await invoiceTemplateService.cloneTemplate(businessId, id);
    return NextResponse.json({ success: true, data: cloned }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to clone template';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

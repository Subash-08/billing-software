/**
 * GET, PUT & DELETE /api/templates/[id] — Template Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { invoiceTemplateService } from '@/services/invoice-template.service';
import { ApplicationError } from '@/lib/errors';
import { Types } from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid template ID format' }, { status: 400 });
    }

    const template = await invoiceTemplateService.getTemplateById(businessId, id);
    return NextResponse.json({ success: true, data: template });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch template';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { id } = await params;
    const body = await req.json();

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid template ID format' }, { status: 400 });
    }

    const updated = await invoiceTemplateService.updateTemplate(businessId, id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to update template configuration';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid template ID format' }, { status: 400 });
    }

    await invoiceTemplateService.deleteTemplate(businessId, id);
    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to delete template';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

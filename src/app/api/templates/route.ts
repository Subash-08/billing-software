/**
 * GET & POST /api/templates — Document Templates Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { invoiceTemplateService } from '@/services/invoice-template.service';
import { ApplicationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const templates = await invoiceTemplateService.getTemplates(businessId);
    return NextResponse.json({ success: true, templates });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch templates';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const body = await req.json();
    const created = await invoiceTemplateService.createTemplate(businessId, body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to create template';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

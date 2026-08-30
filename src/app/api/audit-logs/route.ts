/**
 * GET /api/audit-logs — Business Audit Trail API Endpoint
 *
 * Scoped strictly to authenticated user's businessId.
 * Returns append-only operational audit trail logs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { connectToDatabase } from '@/db/connection';
import { AuditLogModel } from '@/db/models/audit-log.model';
import { ApplicationError } from '@/lib/errors';
import { Types } from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const bId = new Types.ObjectId(businessId);
    const query: Record<string, any> = { businessId: bId };
    if (action) {
      query.action = action;
    }

    const logs = await AuditLogModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    const sanitizedLogs = logs.map((log: any) => ({
      id: log._id.toString(),
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId || 'N/A',
      metadata: log.metadata || {},
      timestamp: log.createdAt,
    }));

    return NextResponse.json({ success: true, items: sanitizedLogs });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch audit logs';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

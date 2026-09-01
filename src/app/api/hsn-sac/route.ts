/**
 * GET /api/hsn-sac — HSN/SAC Master Search Endpoint
 *
 * Query params:
 *   - search: text/code query string
 *   - type: 'HSN' | 'SAC'
 *   - limit: maximum results (default 10, max 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/db/connection';
import { HsnSacModel } from '@/db/models/hsn-sac.model';
import { HSN_SAC_REFERENCE_DATA } from '@/config/hsn-sac-dataset';
import { ApplicationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // Auto-seed reference collection if empty
    const count = await HsnSacModel.countDocuments();
    if (count === 0) {
      const seedDocs = HSN_SAC_REFERENCE_DATA.map(item => ({
        code: item.code,
        type: item.type,
        description: item.description,
        chapter: item.chapter,
        heading: item.heading,
        status: 'ACTIVE',
        effectiveFrom: new Date('2017-07-01'),
      }));
      await HsnSacModel.insertMany(seedDocs, { ordered: false }).catch(() => {});
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const type = searchParams.get('type') as 'HSN' | 'SAC' | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '15', 10), 50);

    const query: Record<string, any> = { status: 'ACTIVE' };
    if (type === 'HSN' || type === 'SAC') {
      query.type = type;
    }

    if (search) {
      const isDigitsOnly = /^[0-9]+$/.test(search);
      if (isDigitsOnly) {
        query.code = { $regex: `^${search}` };
      } else {
        query.$or = [
          { description: { $regex: search, $options: 'i' } },
          { code: { $regex: `^${search}` } },
        ];
      }
    }

    let items = await HsnSacModel.find(query).limit(limit).lean().exec();

    // Fallback to static reference dataset if DB query is empty
    if (items.length === 0 && HSN_SAC_REFERENCE_DATA.length > 0) {
      const filtered = HSN_SAC_REFERENCE_DATA.filter(it => {
        if (type && it.type !== type) return false;
        if (!search) return true;
        return it.code.startsWith(search) || it.description.toLowerCase().includes(search.toLowerCase());
      }).slice(0, limit);

      items = filtered.map((it, idx) => ({
        _id: `ref-${idx}`,
        code: it.code,
        type: it.type,
        description: it.description,
        chapter: it.chapter,
        heading: it.heading,
      })) as any;
    }

    const formatted = items.map((item: any) => ({
      id: item._id ? item._id.toString() : item.code,
      code: item.code,
      type: item.type,
      description: item.description,
      chapter: item.chapter,
      heading: item.heading,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch HSN/SAC codes';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

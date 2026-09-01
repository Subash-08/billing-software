/**
 * POST /api/hsn-sac/validate — Two-Level HSN/SAC Validation Endpoint
 *
 * Request Body:
 *   - code: string (e.g. "847130" or "998314")
 *   - type: 'HSN' | 'SAC'
 *
 * Response:
 *   - valid: boolean
 *   - level?: 'FORMAT' | 'MASTER'
 *   - message?: string
 *   - description?: string (if found in master)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/db/connection';
import { HsnSacModel } from '@/db/models/hsn-sac.model';
import { ApplicationError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, type } = body || {};

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, level: 'FORMAT', message: 'Classification code is required' },
        { status: 400 }
      );
    }

    if (type !== 'HSN' && type !== 'SAC') {
      return NextResponse.json(
        { valid: false, level: 'FORMAT', message: 'Type must be HSN or SAC' },
        { status: 400 }
      );
    }

    const trimmedCode = code.trim();

    // ── LEVEL 1: Format Regex Validation ──────────────────────────────────────
    if (type === 'HSN') {
      if (!/^[0-9]{4,8}$/.test(trimmedCode)) {
        return NextResponse.json({
          valid: false,
          level: 'FORMAT',
          message: 'HSN code must be 4, 6, or 8 numeric digits',
        });
      }
    } else if (type === 'SAC') {
      if (!/^[0-9]{6}$/.test(trimmedCode)) {
        return NextResponse.json({
          valid: false,
          level: 'FORMAT',
          message: 'SAC code must be exactly 6 numeric digits',
        });
      }
    }

    // ── LEVEL 2: Master Lookup Validation ─────────────────────────────────────
    await connectToDatabase();
    const match = await HsnSacModel.findOne({
      code: trimmedCode,
      type,
      status: 'ACTIVE',
    }).lean();

    if (!match) {
      return NextResponse.json({
        valid: false,
        level: 'MASTER',
        message: `${type} code '${trimmedCode}' not found in master catalog. Please verify.`,
      });
    }

    return NextResponse.json({
      valid: true,
      code: match.code,
      type: match.type,
      description: match.description,
    });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ valid: false, error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Validation failed';
    return NextResponse.json({ valid: false, error: msg }, { status: 500 });
  }
}

/**
 * GET /api/tax-rates — Serves active GST Tax Rates for UI dropdowns
 * 
 * Returns all active, effective TaxRate master records sorted by tax percentage.
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/db/connection';
import { taxRateRepository } from '@/db/repositories/tax-rate.repository';
import { ApplicationError } from '@/lib/errors';

export async function GET() {
  try {
    await connectToDatabase();

    const rates = await taxRateRepository.findAllActive();

    const formattedRates = rates.map((r) => ({
      id: r._id.toString(),
      name: r.name || `GST ${r.rate}%`,
      rate: r.rate,
      cgstRate: r.cgstRate,
      sgstRate: r.sgstRate,
      igstRate: r.igstRate,
      utgstRate: r.utgstRate || 0,
      cessRate: r.cessRate || 0,
      effectiveFrom: r.effectiveFrom,
      version: r.version || '1.0',
    }));

    return NextResponse.json({ success: true, data: formattedRates });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch tax rates';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * GET /api/payment-modes — Fetch active payment modes master data [Rule 25]
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/db/connection';
import { PaymentModeModel } from '@/db/models/payment-mode.model';
import { ApplicationError } from '@/lib/errors';

const STANDARD_CODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD'];

export async function GET(_req: NextRequest) {
  try {
    await connectToDatabase();

    let modes = await PaymentModeModel.find({ status: 'ACTIVE' }).sort({ name: 1 }).exec();

    // Auto-seed default payment modes if master table is empty
    if (modes.length === 0) {
      await PaymentModeModel.insertMany([
        { code: 'CASH', name: 'Cash', category: 'CASH', status: 'ACTIVE' },
        { code: 'UPI', name: 'UPI / GPay / PhonePe', category: 'UPI', status: 'ACTIVE' },
        { code: 'BANK_TRANSFER', name: 'Bank Transfer (NEFT/RTGS/IMPS)', category: 'BANK_TRANSFER', status: 'ACTIVE' },
        { code: 'CHEQUE', name: 'Cheque', category: 'CHEQUE', status: 'ACTIVE' },
        { code: 'CARD', name: 'Credit / Debit Card', category: 'CARD', status: 'ACTIVE' },
      ]);
      modes = await PaymentModeModel.find({ status: 'ACTIVE' }).sort({ name: 1 }).exec();
    }

    // Strict filter for standard payment modes & deduplication by code
    const uniqueMap = new Map<string, any>();
    for (const m of modes) {
      if (STANDARD_CODES.includes(m.code) && !uniqueMap.has(m.code)) {
        uniqueMap.set(m.code, m);
      }
    }

    let finalModes = Array.from(uniqueMap.values());
    if (finalModes.length === 0) {
      finalModes = modes.filter(
        (m) =>
          !m.name.toLowerCase().includes('uat') &&
          !m.name.toLowerCase().includes('backup') &&
          !m.name.toLowerCase().includes('test')
      );
    }

    return NextResponse.json({ success: true, data: finalModes });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch payment modes';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

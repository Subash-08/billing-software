/**
 * GET /api/credit-notes — List business Credit Notes
 * POST /api/credit-notes — Create new draft Credit Note
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { creditNoteService } from '@/services/credit-note.service';
import { CreditNoteModel } from '@/db/models/credit-note.model';
import { connectToDatabase } from '@/db/connection';
import { ApplicationError } from '@/lib/errors';
import { Types } from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    await connectToDatabase();

    const creditNotes = await CreditNoteModel.find({ businessId: new Types.ObjectId(businessId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({ success: true, count: creditNotes.length, creditNotes });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch credit notes';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, user } = await requireAuthenticatedBusiness();
    const body = await req.json();

    let creditNote = await creditNoteService.createCreditNote(businessId, user._id.toString(), body);
    creditNote = await creditNoteService.issueCreditNote(businessId, creditNote._id.toString());
    return NextResponse.json({ success: true, creditNote }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to create credit note';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

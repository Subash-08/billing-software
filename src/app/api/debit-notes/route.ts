/**
 * GET /api/debit-notes — List business Debit Notes
 * POST /api/debit-notes — Create new draft Debit Note
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { debitNoteService } from '@/services/debit-note.service';
import { DebitNoteModel } from '@/db/models/debit-note.model';
import { connectToDatabase } from '@/db/connection';
import { ApplicationError } from '@/lib/errors';
import { Types } from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    await connectToDatabase();

    const debitNotes = await DebitNoteModel.find({ businessId: new Types.ObjectId(businessId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({ success: true, count: debitNotes.length, debitNotes });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch debit notes';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, user } = await requireAuthenticatedBusiness();
    const body = await req.json();

    let debitNote = await debitNoteService.createDebitNote(businessId, user._id.toString(), body);
    debitNote = await debitNoteService.issueDebitNote(businessId, debitNote._id.toString());
    return NextResponse.json({ success: true, debitNote }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to create debit note';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

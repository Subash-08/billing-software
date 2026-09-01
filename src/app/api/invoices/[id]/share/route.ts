import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { InvoiceModel } from '@/db/models/invoice.model';
import { connectToDatabase } from '@/db/connection';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuthenticatedBusiness();
    const resolvedParams = await params;
    await connectToDatabase();

    const invoice = await InvoiceModel.findOne({
      _id: resolvedParams.id,
      businessId: user._id,
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Generate cryptographically strong random token
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days valid

    invoice.shareToken = token;
    invoice.shareTokenExpiresAt = expiresAt;
    await invoice.save();

    const origin = req.nextUrl.origin || 'http://localhost:3000';
    const shareUrl = `${origin}/invoice/share/${token}`;

    return NextResponse.json({
      success: true,
      token,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate share link' },
      { status: 500 }
    );
  }
}

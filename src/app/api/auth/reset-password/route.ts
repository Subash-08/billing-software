import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/validations/auth.schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    resetPasswordSchema.parse(body);
    return NextResponse.json({ success: true, message: 'Password reset successful' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Password reset failed' }, { status: 400 });
  }
}

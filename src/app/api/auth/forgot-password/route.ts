import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    logger.info(`Password reset requested for: ${email}. Development Token: reset_dev_token_123`);
    return NextResponse.json({ success: true, message: 'Password reset instructions sent' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Request failed' }, { status: 400 });
  }
}

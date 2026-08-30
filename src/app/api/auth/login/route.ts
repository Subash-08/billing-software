import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await authService.loginUser(body);
    return NextResponse.json({ success: true, user: { id: result.user._id, email: result.user.email } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 401 });
  }
}

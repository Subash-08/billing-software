import { NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';

export async function POST() {
  await authService.logoutUser();
  return NextResponse.json({ success: true });
}

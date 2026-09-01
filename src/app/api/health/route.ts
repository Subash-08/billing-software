import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/db/connection';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectToDatabase();
    const isDbConnected = mongoose.connection.readyState === 1;

    return NextResponse.json({
      status: isDbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: isDbConnected ? 'connected' : 'disconnected',
      version: '1.0.0',
    }, { status: isDbConnected ? 200 : 503 });
  } catch (err: any) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: err.message,
    }, { status: 503 });
  }
}

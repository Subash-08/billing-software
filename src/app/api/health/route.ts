import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/db/connection';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'DISCONNECTED';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await connectToDatabase();
    if (mongoose.connection.readyState === 1) {
      dbStatus = 'CONNECTED';
      // Execute ping command to measure database latency
      await mongoose.connection.db?.admin().ping();
      dbLatencyMs = Date.now() - dbStart;
    }
  } catch (err) {
    dbStatus = 'ERROR';
  }

  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  const isHealthy = dbStatus === 'CONNECTED';

  return NextResponse.json(
    {
      status: isHealthy ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      system: {
        rssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
        heapTotalMb: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
        heapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
      },
      responseTimeMs: Date.now() - startTime,
    },
    { status: isHealthy ? 200 : 503 }
  );
}

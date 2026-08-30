import mongoose from 'mongoose';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

interface GlobalMongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: GlobalMongooseCache | undefined;
}

const cached: GlobalMongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    logger.info('Initializing MongoDB database connection...');

    cached.promise = mongoose
      .connect(env.MONGODB_URI, opts)
      .then((mongooseInstance) => {
        logger.info('MongoDB database connection established successfully.');
        return mongooseInstance;
      })
      .catch((error) => {
        logger.error('MongoDB database connection failure', { error: String(error) });
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { connectToDatabase } from '@/db/connection';
import { UserModel, IUser } from '@/db/models/user.model';
import { env } from '@/config/env';

export const SESSION_COOKIE_NAME = 'niramaalai_session';

/**
 * Generates a secure password hash using crypto.scrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verifies password against a stored scrypt hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) {
      resolve(false);
      return;
    }
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) {
        resolve(false);
        return;
      }
      resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey));
    });
  });
}

/**
 * Creates a signed session token containing userId.
 */
export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ userId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const hmac = crypto.createHmac('sha256', env.BETTER_AUTH_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64');
}

/**
 * Verifies a signed session token and returns the embedded userId if valid.
 */
export function verifySessionToken(token: string): { userId: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const { payload, signature } = decoded;

    const hmac = crypto.createHmac('sha256', env.BETTER_AUTH_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const { userId, expiresAt } = JSON.parse(payload);
    if (Date.now() > expiresAt) {
      return null;
    }

    return { userId };
  } catch {
    return null;
  }
}

/**
 * Server-only helper to set session cookie on response.
 */
export async function setSessionCookie(userId: string) {
  try {
    const token = createSessionToken(userId);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  } catch (err) {
    // Graceful fallback when invoked outside Next.js request context (e.g. CLI tests)
  }
}

/**
 * Server-only helper to clear session cookie.
 */
export async function clearSessionCookie() {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  } catch (err) {
    // Graceful fallback when invoked outside Next.js request context (e.g. CLI tests)
  }
}

/**
 * Resolves current session User from request cookies.
 */
export async function getSessionUser(): Promise<IUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const verified = verifySessionToken(token);
    if (!verified) return null;

    await connectToDatabase();
    const user = await UserModel.findById(verified.userId).exec();
    return user;
  } catch {
    return null;
  }
}

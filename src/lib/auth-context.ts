import { redirect } from 'next/navigation';
import { getSessionUser } from './auth';
import { connectToDatabase } from '@/db/connection';
import { BusinessModel, IBusiness } from '@/db/models/business.model';
import { IUser } from '@/db/models/user.model';
import { AuthenticationError } from './errors';

export interface AuthenticatedContext {
  user: IUser;
  business: IBusiness;
  businessId: string;
}

/**
 * Returns authenticated session User or null if unauthenticated.
 */
export async function getAuthenticatedUser(): Promise<IUser | null> {
  return getSessionUser();
}

/**
 * Ensures request has an authenticated session user, redirecting to /login if unauthenticated.
 */
export async function requireAuthenticatedUser(): Promise<IUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Resolves Business owned by session User.
 * USER WITHOUT BUSINESS STATE: If an authenticated User exists but has no linked Business record,
 * redirects user to /onboarding to complete Business setup.
 */
export async function getAuthenticatedBusiness(): Promise<AuthenticatedContext | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  await connectToDatabase();
  const business = await BusinessModel.findOne({ userId: user._id }).exec();

  if (!business) {
    // Gracefully handle User-without-Business state
    redirect('/onboarding');
  }

  return {
    user,
    business,
    businessId: business._id.toString(),
  };
}

/**
 * Server-only boundary enforcing valid session User and linked Business.
 * Throws AuthenticationError or redirects to /login or /onboarding.
 */
export async function requireAuthenticatedBusiness(): Promise<AuthenticatedContext> {
  const context = await getAuthenticatedBusiness();
  if (!context) {
    redirect('/login');
  }
  return context;
}

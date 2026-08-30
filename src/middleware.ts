import { NextResponse, NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'niramaalai_session';
const PUBLIC_AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];
const PUBLIC_STATIC_PREFIXES = ['/_next', '/api/auth', '/api/public', '/favicon.ico', '/public'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore static assets, public API endpoints, and authentication API routes (/api/auth/*)
  if (PUBLIC_STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  // Edge-safe token presence check
  const isAuthenticated = Boolean(token && token.length > 20);
  const isAuthRoute = PUBLIC_AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // 1. Unauthenticated User attempting to access protected dashboard route -> Redirect to /login
  if (!isAuthenticated && !isAuthRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated User attempting to access auth UI page (/login or /register) -> Redirect to /
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

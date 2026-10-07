import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const authSession = request.cookies.get('auth_session');

  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isPublicPath = publicPaths.some(p => request.nextUrl.pathname.startsWith(p));
  const isSignInPath = ['/login', '/register'].some(p => request.nextUrl.pathname.startsWith(p));

  if (!authSession && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (authSession && isSignInPath) {
    return NextResponse.redirect(new URL('/member', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};

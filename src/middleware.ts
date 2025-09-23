import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { supabase, response } = await updateSession(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone();

  const protectedPaths = ['/home', '/profile'];
  const isProtectedPath = protectedPaths.some((path) => url.pathname.startsWith(path));
  const isAuthPath = ['/login', '/signup', '/confirm'].includes(url.pathname);

  if (user) {
    // If user is logged in and tries to access an auth page, redirect to home.
    if (isAuthPath) {
      url.pathname = '/home';
      return NextResponse.redirect(url);
    }
  } else {
    // If user is not logged in and tries to access a protected page, redirect to login.
    if (isProtectedPath) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

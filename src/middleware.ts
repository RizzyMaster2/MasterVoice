
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // This will refresh the session and update the cookies.
  const { response, user } = await updateSession(request);

  const url = request.nextUrl.clone();

  const protectedPaths = ['/home', '/profile'];
  const authPaths = ['/login', '/signup', '/confirm'];
  
  const isProtectedPath = protectedPaths.some((path) => url.pathname.startsWith(path));
  const isAuthPath = authPaths.includes(url.pathname);

  // If the user is logged in
  if (user) {
    // and they try to access an auth page, redirect them to the home page.
    if (isAuthPath) {
      url.pathname = '/home';
      return NextResponse.redirect(url);
    }
  } else {
    // If the user is not logged in and tries to access a protected page,
    // redirect them to the login page.
    if (isProtectedPath) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Otherwise, continue with the request.
  return response;
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

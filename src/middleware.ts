
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // updateSession will refresh the session and update the cookies
  const response = await updateSession(request)

  // Now, create a client to read the user session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone();

  const protectedPaths = ['/home', '/profile'];
  const isProtectedPath = protectedPaths.some((path) => url.pathname.startsWith(path));
  const isAuthPath = ['/login', '/signup', '/confirm'].includes(url.pathname);
  
  if (user) {
    if (isAuthPath) {
      url.pathname = '/home';
      return NextResponse.redirect(url);
    }
  } else {
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

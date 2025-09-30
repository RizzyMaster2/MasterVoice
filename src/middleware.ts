
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          } catch (e) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          } catch (e) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // if user is signed in, check if their profile exists
  if (user) {
    // If the user's email is not confirmed, they are likely a new sign-up.
    // In this case, we bypass the profile check to allow the database trigger
    // time to create the profile. The profile will be checked on subsequent logins
    // after they have verified their email.
    if (user.email_confirmed_at) {
        const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

        // if profile is missing, sign out and redirect
        if (!profile) {
            await supabase.auth.signOut();
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('error', 'user_not_found');
            return NextResponse.redirect(url);
        }
    } else {
        // Handle case where user is logged in but not verified
        const isAuthPath = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup');
        if (!isAuthPath && request.nextUrl.pathname !== '/confirm') {
            // This is a new, unverified user trying to access a protected page.
            // Let them proceed to the /confirm page.
            // The check will happen on their next verified login.
        }
    }
  }
  

  const publicPaths = ['/login', '/signup', '/confirm', '/unauthenticated', '/faq', '/privacy', '/forgot-password'];
  const isPublicRoot = request.nextUrl.pathname === '/';
  
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path)) || isPublicRoot;
  
  // if user is not logged in and is trying to access a protected route
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/unauthenticated'
    return NextResponse.redirect(url)
  }

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

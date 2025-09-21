import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, type NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = await getResponse(request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = getResponse(request)
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = getResponse(request)
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

function getResponse(request: NextRequest): NextResponse {
    const response = new (require('next/server').NextResponse) as NextResponse;
    // Set the headers from the request
    for (const [key, value] of request.headers.entries()) {
        response.headers.set(key, value);
    }
    // Set other response properties if needed, e.g., status
    return response;
}

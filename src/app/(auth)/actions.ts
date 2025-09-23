'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// This helper function centralizes Supabase client creation for server actions.
// It ensures that environment variables are present and sets up the cookie handling.
function getSupabaseClient() {
  const cookieStore = cookies();

  // The createServerClient function is the correct way to create a Supabase client
  // for use in Server Components, Server Actions, and Route Handlers.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function login(data: any) {
  try {
    const { email, password } = data;

    // Validate input data
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return redirect('/login?message=Invalid form data. Email and password are required.');
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return redirect(`/login?message=Could not authenticate user: ${error.message}`);
    }

    revalidatePath('/', 'layout');
    return redirect('/home');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected server error occurred.';
    console.error('[Login Server Action Error]', message);
    return redirect(`/login?message=${encodeURIComponent(message)}`);
  }
}

export async function signup(data: any) {
    try {
        const { name, email, password } = data;

        // Validate input data
        if (!name || typeof name !== 'string' || !email || typeof email !== 'string' || !password || typeof password !== 'string') {
            return redirect('/signup?message=Invalid form data. Name, email, and password are required.');
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
            data: {
                display_name: name,
            },
            },
        });

        if (error) {
            return redirect(`/signup?message=${error.message}`);
        }

        revalidatePath('/', 'layout');
        return redirect('/confirm');
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An unexpected server error occurred.';
        console.error('[Signup Server Action Error]', message);
        return redirect(`/signup?message=${encodeURIComponent(message)}`);
    }
}

export async function logout() {
  try {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    return redirect('/');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected server error occurred during logout.';
    console.error('[Logout Server Action Error]', message);
    // Even if signout fails, redirect to home. The user might still have a valid session client-side.
    // Or redirect with a message if preferred.
    return redirect(`/?message=${encodeURIComponent(message)}`);
  }
}

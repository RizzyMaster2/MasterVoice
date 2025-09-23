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
}

export async function signup(data: any) {
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
}

export async function logout() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
      console.error('[Logout Server Action Error]', error);
      return redirect(`/?message=An unexpected server error occurred during logout.`);
  }

  return redirect('/');
}

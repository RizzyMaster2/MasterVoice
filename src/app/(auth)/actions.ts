
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Supabase env vars missing');
    throw new Error('Supabase configuration error');
  }

  const cookieStore = cookies();

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

export async function login(formData: FormData) {
  try {
    const email = formData.get('email');
    const password = formData.get('password');

    if (typeof email !== 'string' || typeof password !== 'string') {
      return redirect('/login?message=Invalid form data');
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return redirect(`/login?message=Could not authenticate user: ${error.message}`);
    }

    revalidatePath('/', 'layout');
    redirect('/home');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[Login Error]', message);
    redirect(`/login?message=${encodeURIComponent(message)}`);
  }
}

export async function signup(formData: FormData) {
  try {
    const email = formData.get('email');
    const password = formData.get('password');
    const name = formData.get('name');

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof name !== 'string'
    ) {
      return redirect('/signup?message=Invalid form data');
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
      },
    });

    if (error) {
      return redirect(`/signup?message=${error.message}`);
    }

    revalidatePath('/', 'layout');
    redirect('/confirm');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[Signup Error]', message);
    redirect(`/signup?message=${encodeURIComponent(message)}`);
  }
}

export async function logout() {
  try {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    redirect('/');
  } catch (err: unknown) {
    console.error('[Logout Error]', err);
    redirect('/?message=Logout failed');
  }
}

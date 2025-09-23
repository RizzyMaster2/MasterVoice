'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function getSupabaseClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase environment variables are missing');
  }

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (e) {
          console.warn('[Cookie Set Error]', e);
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (e) {
          console.warn('[Cookie Remove Error]', e);
        }
      },
    },
  });
}

export async function login(data: {
  email: unknown;
  password: unknown;
}) {
  const email = typeof data.email === 'string' ? data.email : '';
  const password = typeof data.password === 'string' ? data.password : '';
  
  let supabase;
  try {
    supabase = await getSupabaseClient();
  } catch(err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return redirect(`/login?message=${encodeURIComponent(message)}`);
  }

  if (!email || !password) {
    return redirect('/login?message=Email%20and%20password%20are%20required.');
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');
  redirect('/home');
}

export async function signup(data: {
  name: unknown;
  email: unknown;
  password: unknown;
}) {
  const name = typeof data.name === 'string' ? data.name : '';
  const email = typeof data.email === 'string' ? data.email : '';
  const password = typeof data.password === 'string' ? data.password : '';

  let supabase;
  try {
    supabase = await getSupabaseClient();
  } catch(err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return redirect(`/signup?message=${encodeURIComponent(message)}`);
  }

  if (!name || !email || !password) {
    return redirect('/signup?message=Name,%20email,%20and%20password%20are%20required.');
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } },
  });

  if (error) {
    return redirect(`/signup?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');
  redirect('/confirm');
}

export async function logout() {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return redirect(`/?message=${encodeURIComponent(error.message)}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected logout error';
    return redirect(`/?message=${encodeURIComponent(message)}`);
  }
  redirect('/');
}

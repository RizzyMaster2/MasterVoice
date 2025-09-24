
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

type ActionResult = { success: true } | { success: false; message: string };

export async function login(data: {
  email: unknown;
  password: unknown;
}): Promise<ActionResult | void> {
  console.log('--- LOGIN ACTION START ---', { email: data.email });
  try {
    const email = typeof data.email === 'string' ? data.email : '';
    const password = typeof data.password === 'string' ? data.password : '';

    if (!email || !password) {
      console.log('[Login Validation Failed] Email or password missing.');
      return { success: false, message: 'Email and password are required.' };
    }

    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('[Login Supabase Error]', error.message);
      return { success: false, message: error.message };
    }

    console.log('--- LOGIN SUCCESS ---');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[Login Unexpected Error]', message);
    return { success: false, message };
  }

  revalidatePath('/', 'layout');
  redirect('/home');
}

export async function signup(data: {
  name: unknown;
  email: unknown;
  password: unknown;
}): Promise<ActionResult | void> {
  console.log('--- SIGNUP ACTION START ---', { name: data.name, email: data.email });
  try {
    const name = typeof data.name === 'string' ? data.name : '';
    const email = typeof data.email === 'string' ? data.email : '';
    const password = typeof data.password === 'string' ? data.password : '';

    if (!name || !email || !password) {
       console.log('[Signup Validation Failed] Name, email, or password missing.');
      return { success: false, message: 'Name, email, and password are required.' };
    }

    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });

    if (error) {
      console.error('[Signup Supabase Error]', error.message);
      return { success: false, message: error.message };
    }

    console.log('--- SIGNUP SUCCESS ---');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[Signup Unexpected Error]', message);
    return { success: false, message };
  }
  revalidatePath('/', 'layout');
  redirect('/confirm');
}

export async function logout(): Promise<ActionResult | void> {
  console.log('--- LOGOUT ACTION START ---');
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[Logout Supabase Error]', error.message);
      return { success: false, message: error.message };
    }

    console.log('--- LOGOUT SUCCESS ---');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected logout error';
    console.error('[Logout Unexpected Error]', message);
    return { success: false, message };
  }
  revalidatePath('/', 'layout');
  redirect('/');
}

'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getSupabaseClient() {
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
}): Promise<ActionResult> {
  try {
    const email = typeof data.email === 'string' ? data.email : '';
    const password = typeof data.password === 'string' ? data.password : '';

    if (!email || !password) {
      return { success: false, message: 'Email and password are required.' };
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[Login Error]', message);
    return { success: false, message };
  }
}

export async function signup(data: {
  name: unknown;
  email: unknown;
  password: unknown;
}): Promise<ActionResult> {
  try {
    const name = typeof data.name === 'string' ? data.name : '';
    const email = typeof data.email === 'string' ? data.email : '';
    const password = typeof data.password === 'string' ? data.password : '';

    if (!name || !email || !password) {
      return { success: false, message: 'Name, email, and password are required.' };
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[Signup Error]', message);
    return { success: false, message };
  }
}

export async function logout(): Promise<ActionResult> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected logout error';
    console.error('[Logout Error]', message);
    return { success: false, message };
  }
}

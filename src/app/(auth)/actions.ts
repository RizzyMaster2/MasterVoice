'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// This is a shared helper function to create a Supabase client for server actions.
// It should not be exported, as actions should be self-contained.
function createSupabaseServerActionClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );
}

export async function login(data: any) {
  const { email, password } = data;
  const supabase = createSupabaseServerActionClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?message=Could not authenticate user: ${error.message}`);
  }

  revalidatePath('/', 'layout');
  redirect('/home');
}

export async function signup(data: any) {
  const { name, email, password } = data;
  const supabase = createSupabaseServerActionClient();

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
    redirect(`/signup?message=${error.message}`);
  }

  revalidatePath('/', 'layout');
  redirect('/confirm');
}

export async function logout() {
  const supabase = createSupabaseServerActionClient();
  await supabase.auth.signOut();
  redirect('/');
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function login(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    if (error.message.includes('Failed to fetch')) {
        return { error: 'Network error. Please check your connection and try again.' };
    }
    // Default to invalid credentials for other auth errors.
    return { error: 'Invalid login credentials.' };
  }

  revalidatePath('/', 'layout');
  redirect('/home');
}

export async function signup(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        display_name: formData.get('name') as string,
      },
    },
  };

    const { error } = await supabase.auth.signUp(data);

    if (error) {
      // The redirect will handle showing the message on the signup page.
      return redirect(`/signup?message=${error.message}`);
    }
  
    revalidatePath('/', 'layout');
    redirect('/confirm');
}

export async function logout() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect('/');
}

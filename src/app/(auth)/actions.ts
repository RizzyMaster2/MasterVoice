'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  try {
    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
      if (error.message.includes('Failed to fetch')) {
        return { error: 'Network error. Please check your connection and try again.' };
      }
      return { error: 'Invalid login credentials.' };
    }

    revalidatePath('/');
    redirect('/home');
  } catch (error) {
    return { error: 'An unexpected error occurred on the server.' };
  }
}

export async function signup(formData: FormData) {
  const supabase = createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        display_name: formData.get('name') as string,
      },
    },
  };

  try {
    const { error } = await supabase.auth.signUp(data);

    if (error) {
        // The redirect will handle showing the message on the signup page.
        return redirect(`/signup?message=${error.message}`);
    }
    
    revalidatePath('/');
    redirect('/confirm');
  } catch (error) {
    return redirect(`/signup?message=An unexpected server error occurred.`);
  }
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}

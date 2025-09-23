
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    // Return to the login page with an error message
    return redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  // On success, redirect to the dashboard. Revalidation is not needed
  // as the redirect will cause a full page load.
  redirect('/dashboard');
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
        data: {
            display_name: formData.get('name') as string,
            // photo_url will be set via profile page
        }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    // Return to the signup page with an error message
    return redirect(`/signup?message=${encodeURIComponent(error.message)}`)
  }
  
  // On success, redirect to the confirmation page.
  redirect('/confirm');
}

export async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/')
}

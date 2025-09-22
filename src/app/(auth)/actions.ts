'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function userExists(email: string): Promise<boolean> {
    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin.from('users').select('id').eq('email', email).single()
    
    // If we get data and no error, the user exists.
    // In all other cases (no data, or an error), we can assume the user doesn't exist or is not findable.
    return !!data && !error;
}


export async function login(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: { user }, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    if (error.message === 'Invalid login credentials') {
        const emailExists = await userExists(data.email);
        if (!emailExists) {
            return { success: false, message: "This account is NOT registered. Try a different one or create an account today." }
        }
    }
    return { success: false, message: error.message }
  }

  if (user) {
    // Set the custom logged_in flag in user_metadata
    await supabase.auth.updateUser({
        data: {
            logged_in: true
        }
    });
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
        data: {
            full_name: formData.get('name') as string,
            logged_in: false // Initialize the flag on signup
        }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath('/confirm', 'layout')
  redirect('/confirm')
}

export async function logout() {
    const supabase = createClient()
    
    // Set the custom logged_in flag to false before signing out
    await supabase.auth.updateUser({
        data: {
            logged_in: false
        }
    });

    await supabase.auth.signOut()
    redirect('/')
}

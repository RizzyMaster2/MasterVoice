
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function userExists(email: string): Promise<boolean> {
    const supabase = createClient()
    // This is a workaround. Ideally we'd use admin client, but it may have issues in some environments.
    // We check if we can get a user's public profile.
    const { data, error } = await supabase.from('profiles').select('id').eq('email', email).single()
    return !!data && !error;
}


export async function login(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    if (error.message === 'Invalid login credentials') {
        const emailExists = await userExists(data.email);
        if (!emailExists) {
            return { success: false, message: "This account is NOT registered. Try a different one or create an account today." }
        }
    }
    return { success: false, message: error.message }
  }

  revalidatePath('/', 'layout');
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
    return { success: false, message: error.message }
  }
  
  redirect('/confirm')
}

export async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/')
}

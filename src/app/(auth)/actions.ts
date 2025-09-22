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
    return { success: false, message: error.message }
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
    await supabase.auth.signOut()
    redirect('/')
}

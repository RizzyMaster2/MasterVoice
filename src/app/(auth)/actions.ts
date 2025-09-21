'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function login(formData: { [key: string]: string; }) {
  const supabase = createClient()

  const data = {
    email: formData.email as string,
    password: formData.password as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath('/', 'layout')
  // The redirect will now be handled on the client side
  return { success: true }
}

export async function signup(formData: { [key: string]: string; }) {
  const supabase = createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.email as string,
    password: formData.password as string,
    options: {
        data: {
            full_name: formData.name
        }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return error.message
  }

  revalidatePath('/', 'layout')
  redirect('/confirm')
}

export async function logout() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
        return error.message
    }
    
    redirect('/')
}

'use server';

import { createClient as createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


export async function deleteUser() {
  const supabase = createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User not found or not authenticated.');
  }

  const supabaseAdmin = createAdminClient();
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Supabase delete error:', deleteError);
    throw new Error('Could not delete user from the database.');
  }
  
  const { error: signOutError } = await supabase.auth.signOut();

  if (signOutError) {
    console.error('Supabase sign out error:', signOutError);
    // Even if sign out fails, the user was deleted, so we proceed
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
